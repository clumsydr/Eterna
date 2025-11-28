import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  private subscriptions = new Map<string, Set<string>>();

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId } = data;

    let subs = this.subscriptions.get(orderId);
    if (!subs) {
      subs = new Set();
      this.subscriptions.set(orderId, subs);
    }
    subs.add(client.id);

    await client.join(orderId);
    return { subscribed: orderId };
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId } = data;
    await client.leave(orderId);
    return { unsubscribed: orderId };
  }

  sendStatus(orderId: string, payload: any) {
    this.server.to(orderId).emit('status', payload);
  }
}
