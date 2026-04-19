import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlpacaService } from '../alpaca/alpaca.service';
import { LoggerSvc } from '../monitoring/logger.service';
import { Bar } from '../strategy/types';

@Injectable()
export class DataService {
  constructor(
    private readonly alpaca: AlpacaService,
    private readonly config: ConfigService,
    private readonly logger: LoggerSvc,
  ) {}

  async fetchHistorical(symbol: string, days = 400): Promise<Bar[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    this.logger.log(`Fetching ${days}d historical data for ${symbol}`, 'DataService');
    const bars = await this.alpaca.getBars(
      symbol,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
    );
    this.logger.log(`Fetched ${bars.length} bars for ${symbol}`, 'DataService');
    return bars;
  }

  async fetchForSymbols(symbols: string[], days = 400): Promise<Map<string, Bar[]>> {
    const result = new Map<string, Bar[]>();
    await Promise.all(
      symbols.map(async sym => {
        const bars = await this.fetchHistorical(sym, days);
        result.set(sym, bars);
      }),
    );
    return result;
  }

  sma(closes: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < window - 1) {
        result.push(NaN);
        continue;
      }
      const slice = closes.slice(i - window + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / window);
    }
    return result;
  }
}
