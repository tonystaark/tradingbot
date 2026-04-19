import { Injectable } from '@nestjs/common';
import { AlpacaService } from '../alpaca/alpaca.service';
import { RiskService } from '../risk/risk.service';
import { AlertService } from '../monitoring/alert.service';
import { LoggerSvc } from '../monitoring/logger.service';
import { OrderRequest, SignalResult } from '../strategy/types';

@Injectable()
export class ExecutionService {
  constructor(
    private readonly alpaca: AlpacaService,
    private readonly risk: RiskService,
    private readonly alert: AlertService,
    private readonly logger: LoggerSvc,
  ) {}

  async executeSignal(signal: SignalResult): Promise<void> {
    const positions = await this.alpaca.getPositions();
    const hasPosition = positions.some(p => p.symbol === signal.symbol);

    if (signal.signal === 'BUY' && !hasPosition) {
      await this.placeBuyOrder(signal);
    } else if (signal.signal === 'SELL' && hasPosition) {
      await this.placeSellOrder(signal, positions.find(p => p.symbol === signal.symbol)!.qty);
    }
  }

  async placeBuyOrder(signal: SignalResult): Promise<void> {
    const positions = await this.alpaca.getPositions();
    if (!(await this.risk.canOpenPosition(positions.length))) return;

    const qty = await this.risk.computePositionSize(signal.price);
    const stopPrice = this.risk.computeStopLossPrice(signal.price, 'buy');

    const marketOrder: OrderRequest = {
      symbol: signal.symbol,
      qty,
      side: 'buy',
      type: 'market',
      timeInForce: 'day',
    };

    const orderId = await this.alpaca.placeOrder(marketOrder);
    if (!orderId) return;

    this.logger.log(`BUY ${qty} ${signal.symbol} @ $${signal.price.toFixed(2)} | Stop: $${stopPrice.toFixed(2)}`, 'ExecutionService');
    await this.alert.tradeExecuted(signal.symbol, 'buy', qty, signal.price);

    const stopOrder: OrderRequest = {
      symbol: signal.symbol,
      qty,
      side: 'sell',
      type: 'stop',
      stopPrice,
      timeInForce: 'gtc',
    };
    await this.alpaca.placeOrder(stopOrder);
  }

  async placeSellOrder(signal: SignalResult, qty: number): Promise<void> {
    const order: OrderRequest = {
      symbol: signal.symbol,
      qty,
      side: 'sell',
      type: 'market',
      timeInForce: 'day',
    };

    const orderId = await this.alpaca.placeOrder(order);
    if (!orderId) return;

    this.logger.log(`SELL ${qty} ${signal.symbol} @ $${signal.price.toFixed(2)}`, 'ExecutionService');
    await this.alert.tradeExecuted(signal.symbol, 'sell', qty, signal.price);
  }

  async placeLimit(symbol: string, side: 'buy' | 'sell', qty: number, price: number): Promise<string | null> {
    return this.alpaca.placeOrder({ symbol, qty, side, type: 'limit', limitPrice: price, timeInForce: 'day' });
  }

  async placeStop(symbol: string, side: 'buy' | 'sell', qty: number, stopPrice: number): Promise<string | null> {
    return this.alpaca.placeOrder({ symbol, qty, side, type: 'stop', stopPrice, timeInForce: 'gtc' });
  }
}
