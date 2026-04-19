import { Module } from '@nestjs/common';
import { MaCrossoverStrategy } from './ma-crossover.strategy';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  providers: [MaCrossoverStrategy],
  exports: [MaCrossoverStrategy],
})
export class StrategyModule {}
