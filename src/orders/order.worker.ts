import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DexRouter } from './dex-router';
import { OrdersService } from './orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderJob } from './types/order-job.type';
import { Job } from 'bullmq';
import { OrderStatus } from './enums/order-status.enum';
import { sleep } from './utils';

@Processor('order-execution')
export class OrderWorker extends WorkerHost {
  private readonly logger = new Logger(OrderWorker.name);
  private readonly dex = new DexRouter();

  constructor(
    private readonly ordersService: OrdersService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {
    super();
  }

  async process(job: Job<OrderJob>) {
    // Getting a job from redis
    const { orderId } = job.data;
    this.logger.log(`Worker started for job: ${orderId}`);

    const order = await this.orderRepo.findOneBy({ orderId });
    if (!order) {
      this.logger.error(`Order with orderId: ${orderId} not found`);
      throw new Error(`Order with orderId: ${orderId} not found`);
    }

    try {
      await this.ordersService.updateOrderStatus(
        order,
        OrderStatus.ROUTING,
        'Fetching Quotes',
      );

      const raydium = await this.dex.getRaydiumQuote(
        order.amountIn,
        order.tokenIn,
        order.tokenOut,
      );

      const meteora = await this.dex.getMeteoraQuote(
        order.amountIn,
        order.tokenIn,
        order.tokenOut,
      );

      const rayOut = order.amountIn * raydium.price * (1 - raydium.fee);
      const meteorOut = order.amountIn * meteora.price * (1 - meteora.fee);

      const best = rayOut > meteorOut ? raydium : meteora;
      const chosenOut = rayOut > meteorOut ? rayOut : meteorOut;

      this.logger.log(
        `Routing decision for order: ${orderId}, venue: ${best.venue}, (out = ${chosenOut}.toFixed(4))`,
      );

      await this.ordersService.updateOrderStatus(
        order,
        OrderStatus.BUILDING,
        `Building ${orderId} for ${best.venue}`,
      );
      await sleep(250);

      await this.ordersService.updateOrderStatus(
        order,
        OrderStatus.SUBMITTED,
        `Submitting ${orderId} for ${best.venue}`,
      );
      await sleep(250);

      const exec = await this.dex.executeSwap(
        best.venue,
        order.amountIn,
        order.tokenIn,
        order.tokenOut,
      );
      order.chosenDex = best.venue;
      order.txHash = exec.txHash;
      order.executedPrice = exec.executedPrice;

      await this.ordersService.updateOrderStatus(
        order,
        OrderStatus.CONFIRMED,
        `Executed ${orderId} on ${best.venue}`,
      );
      await sleep(250);

      this.logger.log(`Order ${orderId} executed successfully`);
      return true;
    } catch (err) {
      this.logger.error(`Order: ${order.orderId} failed: ${err.message}`);
      await this.ordersService.updateOrderStatus(
        order,
        OrderStatus.FAILED,
        err.message,
      );
      throw err;
    }
  }
}
