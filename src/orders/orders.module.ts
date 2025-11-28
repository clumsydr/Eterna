import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderHistory } from './entities/order-history.entity';
import { BullModule } from '@nestjs/bullmq';
import { OrderWorker } from './order.worker';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderHistory]),
    BullModule.registerQueue({
      name: 'order-execution',
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderWorker, OrdersGateway],
})
export class OrdersModule {}
