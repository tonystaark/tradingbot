import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerSvc } from './logger.service';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class AlertService {
  private bot: TelegramBot | null = null;
  private chatId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerSvc,
  ) {
    const token = this.config.get<string>('telegram.botToken');
    this.chatId = this.config.get<string>('telegram.chatId') ?? '';
    if (token) {
      this.bot = new TelegramBot(token);
      this.logger.log('Telegram alerts enabled', 'AlertService');
    }
  }

  async send(message: string): Promise<void> {
    this.logger.log(`ALERT: ${message}`, 'AlertService');
    if (this.bot && this.chatId) {
      try {
        await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
      } catch (err) {
        this.logger.error(`Failed to send Telegram alert: ${(err as Error).message}`, undefined, 'AlertService');
      }
    }
  }

  async tradeExecuted(symbol: string, side: string, qty: number, price: number): Promise<void> {
    await this.send(`*Trade Executed*\n${side.toUpperCase()} ${qty} ${symbol} @ $${price.toFixed(2)}`);
  }

  async stopLossTriggered(symbol: string, loss: number): Promise<void> {
    await this.send(`*Stop-Loss Triggered*\n${symbol} — Loss: $${loss.toFixed(2)}`);
  }

  async killSwitchActivated(): Promise<void> {
    await this.send(`*KILL SWITCH ACTIVATED*\nAll positions closed and trading halted.`);
  }

  async dailySummary(pnl: number, positions: number): Promise<void> {
    const emoji = pnl >= 0 ? '📈' : '📉';
    await this.send(`${emoji} *Daily Summary*\nPnL: $${pnl.toFixed(2)}\nOpen positions: ${positions}`);
  }
}
