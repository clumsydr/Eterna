import { Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderHistory } from './entities/order-history.entity';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { OrderStatus } from './enums/order-status.enum';
import { OrdersGateway } from './orders.gateway';
import { sleep } from './utils';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepo: Repository<OrderHistory>,
    @InjectQueue('order-execution')
    private readonly orderQueue: Queue,
    private readonly gateway: OrdersGateway,
  ) {}

  async createMarketOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const newOrder = await this.orderRepo.save(createOrderDto);
    this.logger.log(`New order created with orderId: ${newOrder.orderId}`);

    await this.orderHistoryRepo.save({
      order: newOrder,
      details: 'Order received and queued',
    });

    this.logger.log(
      `Order History created for orderId: ${newOrder.orderId} with status: ${newOrder.status}`,
    );

    await sleep(250);
    this.gateway.sendStatus(newOrder.orderId, {
      orderId: newOrder.orderId,
      status: OrderStatus.PENDING,
      details: 'Order received',
    });

    await this.orderQueue.add(
      'execute-order',
      {
        orderId: newOrder.orderId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Order job enqueued for orderId: ${newOrder.orderId}`);
    return newOrder;
  }

  async updateOrderStatus(order: Order, status: OrderStatus, details?: string) {
    order.status = status;
    await this.orderRepo.save(order);

    this.logger.log(`Updated order with orderId: ${order.orderId}`);

    await this.orderHistoryRepo.save({
      order,
      status,
      details: details ?? '',
    });
    this.logger.log(`Order history created for orderId: ${order.orderId}`);

    this.gateway.sendStatus(order.orderId, {
      orderId: order.orderId,
      status,
      details,
      timestamp: new Date(),
    });
  }
}
