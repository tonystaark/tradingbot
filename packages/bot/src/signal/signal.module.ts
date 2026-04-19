import { Module } from '@nestjs/common';
import { SignalService } from './signal.service';
import { DataModule } from '../data/data.module';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [DataModule, StrategyModule],
  providers: [SignalService],
  exports: [SignalService],
})
export class SignalModule {}
