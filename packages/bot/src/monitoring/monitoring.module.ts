import { Module, Global } from '@nestjs/common';
import { LoggerSvc } from './logger.service';
import { AlertService } from './alert.service';

@Global()
@Module({
  providers: [LoggerSvc, AlertService],
  exports: [LoggerSvc, AlertService],
})
export class MonitoringModule {}
