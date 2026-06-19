export class OrderItemDto {
  menuId!: string;
  menuName!: string;
  unitPrice!: number;
  quantity!: number;
}

export class OrderDto {
  id!: string;
  sessionId!: string;
  total!: number;
  createdAt!: string;
  items!: OrderItemDto[];
}

export class CreateOrderResponse {
  order!: OrderDto;
  cart!: { sessionId: string; version: number; items: never[]; total: 0 };
}
