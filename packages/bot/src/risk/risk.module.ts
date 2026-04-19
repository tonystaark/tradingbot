import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { AlpacaModule } from '../alpaca/alpaca.module';

@Module({
  imports: [AlpacaModule],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
