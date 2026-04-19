import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { AlpacaModule } from '../alpaca/alpaca.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [AlpacaModule, RiskModule],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
