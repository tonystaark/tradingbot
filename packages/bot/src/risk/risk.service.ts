import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlpacaService } from '../alpaca/alpaca.service';
import { LoggerSvc } from '../monitoring/logger.service';

@Injectable()
export class RiskService {
  private readonly riskPerTrade: number;
  private readonly maxPositions: number;
  private readonly dailyLossLimit: number;
  private dailyStartEquity = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly alpaca: AlpacaService,
    private readonly logger: LoggerSvc,
  ) {
    this.riskPerTrade = this.config.get<number>('risk.riskPerTrade') ?? 0.02;
    this.maxPositions = this.config.get<number>('risk.maxPositions') ?? 5;
    this.dailyLossLimit = this.config.get<number>('risk.dailyLossLimit') ?? 0.05;
  }

  async computePositionSize(price: number, stopLossPct = 0.02): Promise<number> {
    const { equity } = await this.alpaca.getAccount();
    const riskAmount = equity * this.riskPerTrade;
    const stopLossAmount = price * stopLossPct;
    const qty = Math.floor(riskAmount / stopLossAmount);
    this.logger.log(
      `Position size: equity=$${equity.toFixed(0)}, risk=$${riskAmount.toFixed(0)}, price=$${price.toFixed(2)}, qty=${qty}`,
      'RiskService',
    );
    return Math.max(1, qty);
  }

  async checkDailyLossLimit(): Promise<boolean> {
    const { equity } = await this.alpaca.getAccount();
    if (this.dailyStartEquity === 0) {
      this.dailyStartEquity = equity;
      return true;
    }
    const loss = (this.dailyStartEquity - equity) / this.dailyStartEquity;
    if (loss >= this.dailyLossLimit) {
      this.logger.warn(
        `Daily loss limit hit: ${(loss * 100).toFixed(2)}% loss vs ${(this.dailyLossLimit * 100).toFixed(2)}% limit`,
        'RiskService',
      );
      return false;
    }
    return true;
  }

  async canOpenPosition(openPositionCount: number): Promise<boolean> {
    if (openPositionCount >= this.maxPositions) {
      this.logger.warn(`Max positions reached: ${openPositionCount}/${this.maxPositions}`, 'RiskService');
      return false;
    }
    return this.checkDailyLossLimit();
  }

  resetDailyTracking(): void {
    this.dailyStartEquity = 0;
  }

  computeStopLossPrice(entryPrice: number, side: 'buy' | 'sell', pct = 0.02): number {
    return side === 'buy' ? entryPrice * (1 - pct) : entryPrice * (1 + pct);
  }

  computeLimitPrice(currentPrice: number, side: 'buy' | 'sell', slippage = 0.001): number {
    return side === 'buy' ? currentPrice * (1 + slippage) : currentPrice * (1 - slippage);
  }
}
