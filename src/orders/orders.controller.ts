import { Controller, Post, Body, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post('execute')
  async executeOrder(@Body() createOrderDto: CreateOrderDto) {
    this.logger.log(
      `Received new order request: ${JSON.stringify(createOrderDto)}`,
    );
    const order: Order =
      await this.ordersService.createMarketOrder(createOrderDto);

    this.logger.log(`New order created with orderId: ${order.orderId}`);
    return {
      orderId: order.orderId,
      status: order.status,
    };
  }
}
