import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class OrderPreviewDto {
  id!: string;
  total!: number;
  createdAt!: string;
  topItem?: { menuName: string; quantity: number };
}

export class TableCardDto {
  tableId!: string;
  tableNumber!: number;
  activeSessionId?: string | null;
  totalAmount!: number;
  recentOrders!: OrderPreviewDto[];
}

export class DashboardDto {
  storeId!: string;
  tables!: TableCardDto[];
}

export class HistoryQueryDto {
  @IsUUID() tableId!: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}

export class OrderHistoryDto {
  id!: string;
  tableId!: string;
  originalSessionId!: string;
  closedAt!: string;
  summary!: {
    orders: Array<{
      id: string;
      total: number;
      createdAt: string;
      items: Array<{ menuName: string; unitPrice: number; quantity: number }>;
    }>;
    total: number;
  };
}
