import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlpacaService } from '../alpaca/alpaca.service';
import { SignalService } from '../signal/signal.service';
import { BacktestService } from '../backtest/backtest.service';
import { TradingService } from '../trading/trading.service';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { LoggerSvc } from '../monitoring/logger.service';

@Controller('api')
export class ApiController {
  constructor(
    private readonly config: ConfigService,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly alpaca: AlpacaService,
    private readonly signal: SignalService,
    private readonly backtest: BacktestService,
    private readonly trading: TradingService,
    private readonly logger: LoggerSvc,
  ) {}

  @Get('status')
  getStatus() {
    const tradingStatus = this.trading.getStatus();
    return {
      connected: this.alpaca.isConnected(),
      ...tradingStatus,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('account')
  async getAccount() {
    return this.alpaca.getAccount();
  }

  @Get('positions')
  async getPositions() {
    return this.alpaca.getPositions();
  }

  @Get('trades')
  async getTrades(@Query('limit') limit?: string) {
    return this.alpaca.getClosedTrades(limit ? parseInt(limit) : 50);
  }

  @Get('signals')
  async getSignals() {
    return this.signal.generateSignals();
  }

  @Get('signals/:symbol')
  async getSignalForSymbol(@Param('symbol') symbol: string) {
    return this.signal.generateSignalForSymbol(symbol.toUpperCase());
  }

  @Get('config')
  getConfig() {
    return this.runtimeConfig.get();
  }

  @Post('config')
  updateConfig(@Body() body: { symbols?: string[]; shortWindow?: number; longWindow?: number; backtestDays?: number }) {
    const updated = this.runtimeConfig.update(body);
    this.logger.log(`Strategy config updated: ${JSON.stringify(updated)}`, 'ApiController');
    return updated;
  }

  @Get('backtest/:symbol')
  async runBacktest(@Param('symbol') symbol: string, @Query('days') days?: string) {
    const { backtestDays } = this.runtimeConfig.get();
    return this.backtest.run(symbol.toUpperCase(), days ? parseInt(days) : backtestDays);
  }

  @Get('backtest')
  async runAllBacktests(@Query('days') days?: string) {
    return this.backtest.runAll(days ? parseInt(days) : undefined);
  }

  @Post('trading/kill')
  async activateKillSwitch() {
    await this.trading.activateKillSwitch();
    return { success: true, message: 'Kill switch activated' };
  }

  @Post('trading/resume')
  resumeTrading() {
    this.trading.deactivateKillSwitch();
    return { success: true, message: 'Trading resumed' };
  }

  @Post('trading/mode')
  setMode(@Body() body: { mode: 'paper' | 'live' | 'stopped' }) {
    this.trading.setMode(body.mode);
    return { success: true, mode: body.mode };
  }
}
