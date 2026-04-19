import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { AlpacaModule } from '../alpaca/alpaca.module';
import { SignalModule } from '../signal/signal.module';
import { BacktestModule } from '../backtest/backtest.module';
import { TradingModule } from '../trading/trading.module';

@Module({
  imports: [AlpacaModule, SignalModule, BacktestModule, TradingModule],
  controllers: [ApiController],
})
export class ApiModule {}
