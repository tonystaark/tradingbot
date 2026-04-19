import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerSvc } from './monitoring/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(LoggerSvc);
  app.useLogger(logger);
  app.enableCors();

  const port = process.env.BOT_PORT ? parseInt(process.env.BOT_PORT) : 3001;
  await app.listen(port);
  logger.log(`Trading bot listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch(err => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
