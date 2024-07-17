import winston from 'winston';
import path from 'path';
import process from 'process';

export class Logger {
  private logger: winston.Logger;
  private static instance: Logger = null;

  public static get Instance(): Logger {
    if (Logger.instance == null) Logger.instance = new Logger();

    return Logger.instance;
  }

  private constructor() {
    this.logger = winston.createLogger({
      defaultMeta: { mainLabel: 'Server' },
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.align(),
        winston.format.printf(
          ({ message, timestamp, level, mainLabel, childLabel }) => {
            return `${timestamp} (${
              childLabel || mainLabel
            }) [${level}] -> ${message}`;
          }
        )
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'volatilevault.log'),
          lazy: true,
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 10,
          tailable: true,
          zippedArchive: true,
        }),
      ],
    });
  }

  public get defaultLogger(): winston.Logger {
    return this.logger;
  }
  public createChildLogger(label: string): winston.Logger {
    return this.logger.child({ childLabel: label });
  }
}
