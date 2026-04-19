import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SignalService } from '../signal/signal.service';
import { ExecutionService } from '../execution/execution.service';
import { AlpacaService } from '../alpaca/alpaca.service';
import { AlertService } from '../monitoring/alert.service';
import { LoggerSvc } from '../monitoring/logger.service';
import { SignalResult } from '../strategy/types';

type TradingMode = 'paper' | 'live' | 'stopped';

@Injectable()
export class TradingService {
  private mode: TradingMode;
  private killSwitchActive = false;
  private lastSignals: SignalResult[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly signal: SignalService,
    private readonly execution: ExecutionService,
    private readonly alpaca: AlpacaService,
    private readonly alert: AlertService,
    private readonly logger: LoggerSvc,
  ) {
    this.mode = (this.config.get<string>('tradingMode') as TradingMode) ?? 'paper';
    this.logger.log(`Trading service started in ${this.mode} mode`, 'TradingService');
  }

  @Cron('*/1 * * * *')
  async tradingLoop(): Promise<void> {
    if (this.killSwitchActive || this.mode === 'stopped') return;
    if (!this.isMarketHours()) return;

    this.logger.log('Running trading loop', 'TradingService');

    try {
      const signals = await this.signal.generateSignals();
      this.lastSignals = signals;

      for (const sig of signals) {
        if (sig.signal !== 'HOLD') {
          await this.execution.executeSignal(sig);
        }
      }
    } catch (err) {
      this.logger.error(`Trading loop error: ${(err as Error).message}`, undefined, 'TradingService');
    }
  }

  @Cron('0 16 * * 1-5', { timeZone: 'America/New_York' })
  async endOfDaySummary(): Promise<void> {
    const positions = await this.alpaca.getPositions();
    const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    await this.alert.dailySummary(totalPnl, positions.length);
  }

  @Cron('30 9 * * 1-5', { timeZone: 'America/New_York' })
  onMarketOpen(): void {
    this.logger.log('Market open', 'TradingService');
  }

  async activateKillSwitch(): Promise<void> {
    this.killSwitchActive = true;
    this.logger.warn('KILL SWITCH ACTIVATED — halting all trading', 'TradingService');
    await this.alpaca.cancelAllOrders();
    await this.alpaca.closeAllPositions();
    await this.alert.killSwitchActivated();
  }

  deactivateKillSwitch(): void {
    this.killSwitchActive = false;
    this.logger.log('Kill switch deactivated — trading resumed', 'TradingService');
  }

  setMode(mode: TradingMode): void {
    this.mode = mode;
    this.logger.log(`Trading mode changed to: ${mode}`, 'TradingService');
  }

  getStatus(): { mode: TradingMode; killSwitch: boolean; lastSignals: SignalResult[] } {
    return { mode: this.mode, killSwitch: this.killSwitchActive, lastSignals: this.lastSignals };
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = et.getDay();
    if (day === 0 || day === 6) return false;
    const hours = et.getHours();
    const minutes = et.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    return timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 16 * 60;
  }
}
