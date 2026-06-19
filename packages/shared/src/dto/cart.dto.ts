import { IsInt, IsUUID, Min } from 'class-validator';

export class CartItemDto {
  id!: string;
  menuId!: string;
  menuName!: string;
  unitPrice!: number;
  quantity!: number;
  soldout!: boolean;
}

export class CartDto {
  sessionId!: string;
  version!: number;
  items!: CartItemDto[];
  total!: number;
}

export class AddCartItemDto {
  @IsUUID() menuId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt() @Min(0) quantity!: number;
}
