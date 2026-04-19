import { Module } from '@nestjs/common';
import { TradingService } from './trading.service';
import { SignalModule } from '../signal/signal.module';
import { ExecutionModule } from '../execution/execution.module';
import { AlpacaModule } from '../alpaca/alpaca.module';

@Module({
  imports: [SignalModule, ExecutionModule, AlpacaModule],
  providers: [TradingService],
  exports: [TradingService],
})
export class TradingModule {}
