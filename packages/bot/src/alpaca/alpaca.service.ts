import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerSvc } from '../monitoring/logger.service';
import type AlpacaType from '@alpacahq/alpaca-trade-api';
import { Bar, OrderRequest, Position, Trade } from '../strategy/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Alpaca = require('@alpacahq/alpaca-trade-api') as typeof AlpacaType;

@Injectable()
export class AlpacaService implements OnModuleInit {
  private client!: InstanceType<typeof AlpacaType>;
  private isPaper: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerSvc,
  ) {
    this.isPaper = this.config.get<string>('tradingMode') === 'paper';
  }

  onModuleInit(): void {
    const keyId = this.config.get<string>('alpaca.keyId') ?? '';
    const secretKey = this.config.get<string>('alpaca.secretKey') ?? '';

    if (!keyId || !secretKey) {
      this.logger.warn('Alpaca API credentials not set — running in demo mode', 'AlpacaService');
      return;
    }

    this.client = new Alpaca({ keyId, secretKey, paper: this.isPaper });
    this.logger.log(`Alpaca connected (${this.isPaper ? 'paper' : 'live'})`, 'AlpacaService');
  }

  isConnected(): boolean {
    return !!this.client;
  }

  async getAccount(): Promise<{ equity: number; cash: number; buyingPower: number }> {
    if (!this.client) return { equity: 100000, cash: 100000, buyingPower: 100000 };
    const acct = await this.client.getAccount();
    return {
      equity: parseFloat(acct.equity),
      cash: parseFloat(acct.cash),
      buyingPower: parseFloat(acct.buying_power),
    };
  }

  async getBars(symbol: string, start: string, end: string, timeframe = '1Day'): Promise<Bar[]> {
    if (!this.client) return this.mockBars(symbol, start, end);

    const bars: Bar[] = [];
    try {
      const resp = this.client.getBarsV2(symbol, {
        start,
        end,
        timeframe: this.client.newTimeframe(1, this.client.timeframeUnit.DAY),
        feed: 'iex',
        limit: 1000,
      });
      for await (const bar of resp) {
        bars.push({
          timestamp: bar.Timestamp,
          open: bar.OpenPrice,
          high: bar.HighPrice,
          low: bar.LowPrice,
          close: bar.ClosePrice,
          volume: bar.Volume,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to fetch bars for ${symbol}: ${(err as Error).message}`, undefined, 'AlpacaService');
    }
    return bars;
  }

  async getLatestPrice(symbol: string): Promise<number> {
    if (!this.client) return 150 + Math.random() * 50;
    try {
      const snap = await this.client.getSnapshot(symbol);
      return snap.LatestTrade?.Price ?? snap.LatestQuote?.AskPrice ?? 0;
    } catch {
      return 0;
    }
  }

  async getPositions(): Promise<Position[]> {
    if (!this.client) return [];
    try {
      const raw = await this.client.getPositions();
      return raw.map((p: Record<string, string>) => ({
        symbol: p.symbol,
        qty: parseFloat(p.qty),
        avgEntryPrice: parseFloat(p.avg_entry_price),
        currentPrice: parseFloat(p.current_price),
        unrealizedPnl: parseFloat(p.unrealized_pl),
        unrealizedPnlPercent: parseFloat(p.unrealized_plpc) * 100,
        side: p.side as 'long' | 'short',
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch positions: ${(err as Error).message}`, undefined, 'AlpacaService');
      return [];
    }
  }

  async getClosedTrades(limit = 50): Promise<Trade[]> {
    if (!this.client) return [];
    try {
      const orders = await this.client.getOrders({ status: 'closed', limit, direction: 'desc', until: undefined, after: undefined, nested: undefined, symbols: undefined });
      return orders
        .filter((o: Record<string, string>) => o.filled_at)
        .map((o: Record<string, string>) => ({
          id: o.id,
          symbol: o.symbol,
          side: o.side as 'buy' | 'sell',
          qty: parseFloat(o.filled_qty),
          price: parseFloat(o.filled_avg_price),
          timestamp: o.filled_at,
        }));
    } catch (err) {
      this.logger.error(`Failed to fetch orders: ${(err as Error).message}`, undefined, 'AlpacaService');
      return [];
    }
  }

  async placeOrder(req: OrderRequest): Promise<string | null> {
    if (!this.client) {
      this.logger.warn(`Mock order: ${req.side} ${req.qty} ${req.symbol} @ ${req.type}`, 'AlpacaService');
      return `mock-${Date.now()}`;
    }
    try {
      const order = await this.client.createOrder({
        symbol: req.symbol,
        qty: req.qty,
        side: req.side,
        type: req.type,
        time_in_force: req.timeInForce ?? 'day',
        ...(req.limitPrice ? { limit_price: req.limitPrice } : {}),
        ...(req.stopPrice ? { stop_price: req.stopPrice } : {}),
      });
      return order.id;
    } catch (err) {
      this.logger.error(`Order failed for ${req.symbol}: ${(err as Error).message}`, undefined, 'AlpacaService');
      return null;
    }
  }

  async cancelAllOrders(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.cancelAllOrders();
    } catch (err) {
      this.logger.error(`Failed to cancel orders: ${(err as Error).message}`, undefined, 'AlpacaService');
    }
  }

  async closeAllPositions(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.closeAllPositions();
    } catch (err) {
      this.logger.error(`Failed to close positions: ${(err as Error).message}`, undefined, 'AlpacaService');
    }
  }

  private mockBars(symbol: string, start: string, end: string): Bar[] {
    const bars: Bar[] = [];
    let price = symbol === 'AAPL' ? 150 : symbol === 'MSFT' ? 300 : 140;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    for (let t = startMs; t <= endMs; t += 86400000) {
      const d = new Date(t);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const change = (Math.random() - 0.48) * 3;
      price = Math.max(1, price + change);
      bars.push({
        timestamp: d.toISOString(),
        open: price - Math.random(),
        high: price + Math.random() * 2,
        low: price - Math.random() * 2,
        close: price,
        volume: Math.floor(Math.random() * 50000000 + 10000000),
      });
    }
    return bars;
  }
}
