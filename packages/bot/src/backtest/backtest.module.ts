import { Module } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { DataModule } from '../data/data.module';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [DataModule, StrategyModule],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
