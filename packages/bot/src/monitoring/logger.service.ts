import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerSvc implements LoggerService {
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly botLog: string;
  private readonly errorLog: string;

  constructor() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.botLog = path.join(this.logDir, 'bot.log');
    this.errorLog = path.join(this.logDir, 'errors.log');
  }

  log(message: string, context?: string): void {
    this.write('INFO ', message, context, this.botLog);
  }

  error(message: string, trace?: string, context?: string): void {
    this.write('ERROR', message, context, this.botLog);
    this.write('ERROR', message, context, this.errorLog);
    if (trace) {
      this.write('TRACE', trace, context, this.errorLog);
    }
  }

  warn(message: string, context?: string): void {
    this.write('WARN ', message, context, this.botLog);
  }

  debug(message: string, context?: string): void {
    this.write('DEBUG', message, context, this.botLog);
  }

  verbose(message: string, context?: string): void {
    this.write('VERB ', message, context, this.botLog);
  }

  private write(level: string, message: string, context: string | undefined, file: string): void {
    const ts = new Date().toISOString();
    const ctx = context ? ` [${context}]` : '';
    const line = `[${ts}] [${level}]${ctx} ${message}\n`;
    process.stdout.write(line);
    fs.appendFileSync(file, line);
  }
}
