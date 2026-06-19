import { IsInt, Min } from 'class-validator';

export class TableDto {
  id!: string;
  storeId!: string;
  number!: number;
  qrToken!: string;
  active!: boolean;
}

export class CreateTableDto {
  @IsInt() @Min(1) number!: number;
}

export class QrRegenerateResponse {
  tableId!: string;
  qrToken!: string;
  imageUrl!: string;
  pdfUrl!: string;
}
