import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { Bar, Signal, SignalResult } from './types';

@Injectable()
export class MaCrossoverStrategy {
  constructor(
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly data: DataService,
  ) {}

  computeSignal(bars: Bar[]): SignalResult {
    const { shortWindow, longWindow } = this.runtimeConfig.get();
    const closes = bars.map(b => b.close);
    const latest = bars[bars.length - 1];

    if (closes.length < longWindow) {
      return { symbol: 'UNKNOWN', signal: 'HOLD', price: latest?.close ?? 0, timestamp: new Date().toISOString(), reason: `Insufficient data (${closes.length}/${longWindow} bars)` };
    }

    const shortSma = this.data.sma(closes, shortWindow);
    const longSma = this.data.sma(closes, longWindow);

    const prevShort = shortSma[shortSma.length - 2];
    const prevLong = longSma[longSma.length - 2];
    const currShort = shortSma[shortSma.length - 1];
    const currLong = longSma[longSma.length - 1];

    let signal: Signal = 'HOLD';
    let reason = 'No crossover detected';

    if (!isNaN(prevShort) && !isNaN(prevLong)) {
      if (prevShort <= prevLong && currShort > currLong) {
        signal = 'BUY';
        reason = `Golden cross: SMA${shortWindow}(${currShort.toFixed(2)}) crossed above SMA${longWindow}(${currLong.toFixed(2)})`;
      } else if (prevShort >= prevLong && currShort < currLong) {
        signal = 'SELL';
        reason = `Death cross: SMA${shortWindow}(${currShort.toFixed(2)}) crossed below SMA${longWindow}(${currLong.toFixed(2)})`;
      } else {
        reason = `SMA${shortWindow}=${currShort.toFixed(2)}, SMA${longWindow}=${currLong.toFixed(2)} — No crossover detected`;
      }
    }

    return { symbol: 'UNKNOWN', signal, price: latest.close, timestamp: latest.timestamp, reason };
  }

  getSmaValues(bars: Bar[]): { shortSma: number[]; longSma: number[] } {
    const { shortWindow, longWindow } = this.runtimeConfig.get();
    const closes = bars.map(b => b.close);
    return {
      shortSma: this.data.sma(closes, shortWindow),
      longSma: this.data.sma(closes, longWindow),
    };
  }
}
