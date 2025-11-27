import { Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderHistory } from './entities/order-history.entity';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderHistory)
    private readonly orderHistoryRepo: Repository<OrderHistory>,
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
    return newOrder;
  }

  // findAll() {
  //   return `This action returns all orders`;
  // }
  //
  // findOne(id: number) {
  //   return `This action returns a #${id} order`;
  // }
  //
  // update(id: number, updateOrderDto: UpdateOrderDto) {
  //   return `This action updates a #${id} order`;
  // }
  //
  // remove(id: number) {
  //   return `This action removes a #${id} order`;
  // }
}
