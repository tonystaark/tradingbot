import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StrategyConfig {
  symbols: string[];
  shortWindow: number;
  longWindow: number;
  backtestDays: number;
}

@Injectable()
export class RuntimeConfigService {
  private state: StrategyConfig;

  constructor(private readonly config: ConfigService) {
    this.state = {
      symbols: this.config.get<string[]>('symbols') ?? ['AAPL', 'MSFT', 'GOOGL'],
      shortWindow: this.config.get<number>('strategy.shortWindow') ?? 20,
      longWindow: this.config.get<number>('strategy.longWindow') ?? 50,
      backtestDays: this.config.get<number>('strategy.backtestDays') ?? 1500,
    };
  }

  get(): StrategyConfig {
    return { ...this.state };
  }

  update(patch: Partial<StrategyConfig>): StrategyConfig {
    if (patch.symbols) this.state.symbols = patch.symbols.map(s => s.trim().toUpperCase()).filter(Boolean);
    if (patch.shortWindow) this.state.shortWindow = patch.shortWindow;
    if (patch.longWindow) this.state.longWindow = patch.longWindow;
    if (patch.backtestDays) this.state.backtestDays = patch.backtestDays;
    return this.get();
  }
}
