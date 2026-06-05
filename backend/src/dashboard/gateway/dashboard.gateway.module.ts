import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DashboardGateway } from './dashboard.gateway';
import { SummaryModule } from '../summary/summary.module';

@Module({
  imports: [
    SummaryModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'ate-vision-secret-key-10029',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [DashboardGateway],
  exports: [DashboardGateway],
})
export class DashboardGatewayModule {}
