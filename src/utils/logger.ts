import pino from 'pino';
import pretty from 'pino-pretty';
import { env } from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';

const stream = isProduction
  ? undefined
  : pretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      singleLine: false,
    });

const baseLogger = stream
  ? pino({ level: env.LOG_LEVEL }, stream)
  : pino({ level: env.LOG_LEVEL });

export class Logger {
  private readonly child: pino.Logger;

  public constructor(public readonly context: string) {
    this.child = baseLogger.child({ context });
  }

  public trace(msg: string, metadata?: unknown): void {
    if (metadata !== undefined) {
      this.child.trace({ data: metadata }, msg);
    } else {
      this.child.trace(msg);
    }
  }

  public debug(msg: string, metadata?: unknown): void {
    if (metadata !== undefined) {
      this.child.debug({ data: metadata }, msg);
    } else {
      this.child.debug(msg);
    }
  }

  public info(msg: string, metadata?: unknown): void {
    if (metadata !== undefined) {
      this.child.info({ data: metadata }, msg);
    } else {
      this.child.info(msg);
    }
  }

  public warn(msg: string, metadata?: unknown): void {
    if (metadata !== undefined) {
      this.child.warn({ data: metadata }, msg);
    } else {
      this.child.warn(msg);
    }
  }

  public error(msg: string, metadata?: unknown): void {
    if (metadata !== undefined) {
      this.child.error({ err: metadata }, msg);
    } else {
      this.child.error(msg);
    }
  }

  public fatal(msg: string, metadata?: unknown): void {
    if (metadata !== undefined) {
      this.child.fatal({ err: metadata }, msg);
    } else {
      this.child.fatal(msg);
    }
  }
}
