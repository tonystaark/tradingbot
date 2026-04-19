import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataService } from '../data/data.service';
import { MaCrossoverStrategy } from '../strategy/ma-crossover.strategy';
import { LoggerSvc } from '../monitoring/logger.service';
import { SignalResult } from '../strategy/types';

@Injectable()
export class SignalService {
  private readonly symbols: string[];

  constructor(
    private readonly config: ConfigService,
    private readonly data: DataService,
    private readonly strategy: MaCrossoverStrategy,
    private readonly logger: LoggerSvc,
  ) {
    this.symbols = this.config.get<string[]>('symbols') ?? ['AAPL'];
  }

  async generateSignals(): Promise<SignalResult[]> {
    const barsMap = await this.data.fetchForSymbols(this.symbols);
    const results: SignalResult[] = [];

    for (const symbol of this.symbols) {
      const bars = barsMap.get(symbol) ?? [];
      try {
        const result = this.strategy.computeSignal(bars);
        result.symbol = symbol;
        this.logger.log(`Signal for ${symbol}: ${result.signal} — ${result.reason}`, 'SignalService');
        results.push(result);
      } catch (err) {
        this.logger.error(`Error generating signal for ${symbol}: ${(err as Error).message}`, undefined, 'SignalService');
      }
    }

    return results;
  }

  async generateSignalForSymbol(symbol: string): Promise<SignalResult> {
    const bars = await this.data.fetchHistorical(symbol);
    const result = this.strategy.computeSignal(bars);
    result.symbol = symbol;
    return result;
  }
}
