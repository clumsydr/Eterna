import { DexVenue } from './enums/dex.enum';
import { sleep } from './utils';

export class DexRouter {
  async getRaydiumQuote(amountIn: number, tokenIn: string, tokenOut: string) {
    await sleep(200);
    const price = 1 * (0.98 + Math.random() * 0.04);
    const fee = 0.003;
    return { venue: DexVenue.RAYDIUM, price, fee };
  }

  async getMeteoraQuote(amountIn: number, tokenIn: string, tokenOut: string) {
    await sleep(200);
    const price = 1 * (0.97 + Math.random() * 0.05);
    const fee = 0.002;
    return { venue: DexVenue.METEORA, price, fee };
  }

  async executeSwap(
    venue: DexVenue,
    amountIn: number,
    tokenIn: string,
    tokenOut: string,
  ) {
    await sleep(2000 + Math.random() * 1000);

    const txHash =
      'mock_' +
      tokenIn +
      tokenOut +
      amountIn.toString() +
      Math.random().toString(36).slice(2);
    const executedPrice = 1 * (0.97 + Math.random() * 0.06);

    return { txHash, executedPrice };
  }
}
