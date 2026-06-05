import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import compression from 'compression';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // Ensure the DFT uploads directory exists on startup
  fs.mkdirSync('./uploads/ate-dft', { recursive: true });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino logger
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Security & Performance middlewares
  app.use(helmet());
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.use(compression());

  // Prevent browser caching for all API responses
  app.use((req: any, res: any, next: any) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
  });

  // Setup WS adapter for WebSockets
  app.useWebSocketAdapter(new WsAdapter(app));

  // Global API Prefix
  app.setGlobalPrefix('api');

  // Global pipes & filters
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Start listening on port 3001
  await app.listen(port);
}
bootstrap();
