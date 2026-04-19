import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataService } from '../data/data.service';
import { Bar, Signal, SignalResult } from './types';

@Injectable()
export class MaCrossoverStrategy {
  private readonly shortWindow: number;
  private readonly longWindow: number;

  constructor(
    private readonly config: ConfigService,
    private readonly data: DataService,
  ) {
    this.shortWindow = this.config.get<number>('strategy.shortWindow') ?? 50;
    this.longWindow = this.config.get<number>('strategy.longWindow') ?? 200;
  }

  computeSignal(bars: Bar[]): SignalResult {
    const symbol = 'UNKNOWN';
    const closes = bars.map(b => b.close);
    const latest = bars[bars.length - 1];

    if (closes.length < this.longWindow) {
      return { symbol, signal: 'HOLD', price: latest?.close ?? 0, timestamp: new Date().toISOString(), reason: `Insufficient data (${closes.length}/${this.longWindow} bars)` };
    }

    const shortSma = this.data.sma(closes, this.shortWindow);
    const longSma = this.data.sma(closes, this.longWindow);

    const prevShort = shortSma[shortSma.length - 2];
    const prevLong = longSma[longSma.length - 2];
    const currShort = shortSma[shortSma.length - 1];
    const currLong = longSma[longSma.length - 1];

    let signal: Signal = 'HOLD';
    let reason = 'No crossover detected';

    if (!isNaN(prevShort) && !isNaN(prevLong)) {
      if (prevShort <= prevLong && currShort > currLong) {
        signal = 'BUY';
        reason = `Golden cross: SMA${this.shortWindow}(${currShort.toFixed(2)}) crossed above SMA${this.longWindow}(${currLong.toFixed(2)})`;
      } else if (prevShort >= prevLong && currShort < currLong) {
        signal = 'SELL';
        reason = `Death cross: SMA${this.shortWindow}(${currShort.toFixed(2)}) crossed below SMA${this.longWindow}(${currLong.toFixed(2)})`;
      } else {
        reason = `SMA${this.shortWindow}=${currShort.toFixed(2)}, SMA${this.longWindow}=${currLong.toFixed(2)} — No crossover detected`;
      }
    }

    return { symbol, signal, price: latest.close, timestamp: latest.timestamp, reason };
  }

  getSmaValues(bars: Bar[]): { shortSma: number[]; longSma: number[] } {
    const closes = bars.map(b => b.close);
    return {
      shortSma: this.data.sma(closes, this.shortWindow),
      longSma: this.data.sma(closes, this.longWindow),
    };
  }
}
