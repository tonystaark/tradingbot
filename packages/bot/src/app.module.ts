import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AlpacaModule } from './alpaca/alpaca.module';
import { DataModule } from './data/data.module';
import { StrategyModule } from './strategy/strategy.module';
import { SignalModule } from './signal/signal.module';
import { BacktestModule } from './backtest/backtest.module';
import { RiskModule } from './risk/risk.module';
import { ExecutionModule } from './execution/execution.module';
import { TradingModule } from './trading/trading.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    MonitoringModule,
    RuntimeConfigModule,
    AlpacaModule,
    DataModule,
    StrategyModule,
    SignalModule,
    BacktestModule,
    RiskModule,
    ExecutionModule,
    TradingModule,
    ApiModule,
  ],
})
export class AppModule {}
