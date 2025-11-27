import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  tokenIn: string;

  @IsString()
  tokenOut: string;

  @IsNumber()
  @IsPositive()
  amountIn: number;
}
