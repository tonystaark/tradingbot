import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { MaCrossoverStrategy } from '../strategy/ma-crossover.strategy';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { LoggerSvc } from '../monitoring/logger.service';
import { SignalResult } from '../strategy/types';

@Injectable()
export class SignalService {
  constructor(
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly data: DataService,
    private readonly strategy: MaCrossoverStrategy,
    private readonly logger: LoggerSvc,
  ) {}

  async generateSignals(): Promise<SignalResult[]> {
    const { symbols } = this.runtimeConfig.get();
    const barsMap = await this.data.fetchForSymbols(symbols);
    const results: SignalResult[] = [];

    for (const symbol of symbols) {
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
