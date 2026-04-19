import { Module } from '@nestjs/common';
import { DataService } from './data.service';
import { AlpacaModule } from '../alpaca/alpaca.module';

@Module({
  imports: [AlpacaModule],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
