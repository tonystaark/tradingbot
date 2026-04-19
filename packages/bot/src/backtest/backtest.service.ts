import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { MaCrossoverStrategy } from '../strategy/ma-crossover.strategy';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { LoggerSvc } from '../monitoring/logger.service';
import { BacktestResult, BacktestTrade, Bar } from '../strategy/types';

@Injectable()
export class BacktestService {
  constructor(
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly data: DataService,
    private readonly strategy: MaCrossoverStrategy,
    private readonly logger: LoggerSvc,
  ) {}

  async run(symbol: string, days = 365, initialCapital = 100000): Promise<BacktestResult> {
    this.logger.log(`Running backtest for ${symbol} over ${days} days`, 'BacktestService');

    const bars = await this.data.fetchHistorical(symbol, days + 250);
    const closes = bars.map(b => b.close);
    const { shortSma, longSma } = this.strategy.getSmaValues(bars);

    const trades: BacktestTrade[] = [];
    let capital = initialCapital;
    let openTrade: BacktestTrade | null = null;
    const equityCurve: number[] = [capital];

    for (let i = 1; i < bars.length; i++) {
      const prevShort = shortSma[i - 1];
      const prevLong = longSma[i - 1];
      const currShort = shortSma[i];
      const currLong = longSma[i];
      const bar = bars[i];

      if (isNaN(prevShort) || isNaN(prevLong) || isNaN(currShort) || isNaN(currLong)) continue;

      const goldenCross = prevShort <= prevLong && currShort > currLong;
      const deathCross = prevShort >= prevLong && currShort < currLong;

      if (goldenCross && !openTrade) {
        const qty = Math.floor(capital / bar.close);
        openTrade = {
          symbol,
          side: 'buy',
          qty,
          entryPrice: bar.close,
          entryDate: bar.timestamp,
        };
      } else if ((deathCross || i === bars.length - 1) && openTrade) {
        const pnl = (bar.close - openTrade.entryPrice) * openTrade.qty;
        openTrade.exitPrice = bar.close;
        openTrade.exitDate = bar.timestamp;
        openTrade.pnl = pnl;
        openTrade.pnlPct = (bar.close - openTrade.entryPrice) / openTrade.entryPrice * 100;
        capital += pnl;
        trades.push({ ...openTrade });
        openTrade = null;
      }

      equityCurve.push(capital);
    }

    const totalReturn = capital - initialCapital;
    const totalReturnPct = (totalReturn / initialCapital) * 100;
    const winningTrades = trades.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl ?? 0) <= 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const sharpeRatio = this.computeSharpe(equityCurve);
    const maxDrawdown = this.computeMaxDrawdown(equityCurve);

    const result: BacktestResult = {
      symbol,
      startDate: bars[0]?.timestamp ?? '',
      endDate: bars[bars.length - 1]?.timestamp ?? '',
      initialCapital,
      finalCapital: capital,
      totalReturn,
      totalReturnPct,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      trades,
    };

    this.logger.log(
      `Backtest ${symbol}: Return=${totalReturnPct.toFixed(2)}%, Sharpe=${sharpeRatio.toFixed(2)}, Drawdown=${maxDrawdown.toFixed(2)}%, WinRate=${winRate.toFixed(1)}%, Trades=${trades.length}`,
      'BacktestService',
    );

    return result;
  }

  async runAll(days?: number, initialCapital = 100000): Promise<BacktestResult[]> {
    const { symbols, backtestDays } = this.runtimeConfig.get();
    return Promise.all(symbols.map(s => this.run(s, days ?? backtestDays, initialCapital)));
  }

  private computeSharpe(equityCurve: number[]): number {
    if (equityCurve.length < 2) return 0;
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    const annualized = mean * 252;
    const annualizedStd = std * Math.sqrt(252);
    return annualized / annualizedStd;
  }

  private computeMaxDrawdown(equityCurve: number[]): number {
    let peak = equityCurve[0];
    let maxDd = 0;
    for (const val of equityCurve) {
      if (val > peak) peak = val;
      const dd = (peak - val) / peak * 100;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  }
}
