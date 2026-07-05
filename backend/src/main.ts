import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { buildCorsOptions } from './config/cors.config';

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

function resolveLogLevels(level: string): LogLevel[] {
  const index = LOG_LEVELS.indexOf(level as LogLevel);
  const cutoff = index >= 0 ? index : LOG_LEVELS.indexOf('log');
  return LOG_LEVELS.slice(0, cutoff + 1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  app.useLogger(
    resolveLogLevels(configService.get<string>('LOG_LEVEL', 'log')),
  );

  const logger = new Logger('Bootstrap');

  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors(buildCorsOptions(configService));

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
