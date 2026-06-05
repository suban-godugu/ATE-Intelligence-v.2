// d:\officw work -1\ai-1\backend\src\minio\minio.module.ts
import { Global, Module, Inject, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: MINIO_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const endPoint = configService.get<string>('MINIO_ENDPOINT') || 'localhost';
        const port = Number(configService.get<number>('MINIO_PORT') || 9000);
        const useSSL = configService.get<string>('MINIO_USE_SSL') === 'true';
        const accessKey = configService.get<string>('MINIO_ROOT_USER') || 'compty_admin';
        const secretKey = configService.get<string>('MINIO_ROOT_PASSWORD') || 'change_me_in_production';

        return new Client({
          endPoint,
          port,
          useSSL,
          accessKey,
          secretKey,
        });
      },
    },
  ],
  exports: [MINIO_CLIENT],
})
export class MinioModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(MinioModule.name);

  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Client,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const bucket = this.configService.get<string>('MINIO_BUCKET_WAFER') || 'wafer-images';
    try {
      this.logger.log(`Checking if MinIO bucket [${bucket}] exists...`);
      const exists = await this.minioClient.bucketExists(bucket);
      
      if (!exists) {
        this.logger.log(`Bucket [${bucket}] does not exist. Provisioning bucket now...`);
        // Provision the bucket in default region 'us-east-1'
        await this.minioClient.makeBucket(bucket, 'us-east-1');
        
        // Define public S3 bucket read policy to allow pre-signed URL and GET requests compatibility
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        };
        
        await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
        this.logger.log(`Successfully applied public read policy to MinIO bucket [${bucket}].`);
      }
      
      this.logger.log(`MinIO bucket [${bucket}] ready`);
    } catch (err: any) {
      this.logger.error(`Failed to initialize MinIO bucket [${bucket}]: ${err.message}`, err.stack);
    }
  }
}
