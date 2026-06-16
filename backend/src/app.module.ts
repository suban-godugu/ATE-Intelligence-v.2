import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WaferImageModule } from './wafer-image/wafer-image.module';
import { MinioModule } from './minio/minio.module';
import { AteDftModule } from './ate-dft/ate-dft.module';
import { UploadModule } from './dashboard/upload/upload.module';
import { ModelValidationModule } from './model-validation/model-validation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          lazyConnect: true,
          retryStrategy: (times: number) => Math.min(times * 500, 5000),
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
    DashboardModule,
    WaferImageModule,
    MinioModule,
    AteDftModule,
    UploadModule,
    ModelValidationModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
