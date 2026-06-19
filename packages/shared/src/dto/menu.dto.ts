import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class MenuDto {
  id!: string;
  storeId!: string;
  categoryId!: string;
  categoryName!: string;
  name!: string;
  price!: number;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder!: number;
  soldout!: boolean;
}

export class CreateMenuDto {
  @IsUUID() categoryId!: string;
  @IsString() @MinLength(1) name!: string;
  @IsInt() @Min(1) price!: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
}

export class UpdateMenuDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsInt() @Min(1) price?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
}

export class MenuSortDto {
  @IsArray() @ArrayMinSize(1) @IsUUID(undefined, { each: true })
  ids!: string[];
}

export class SoldoutToggleDto {
  @IsBoolean() soldout!: boolean;
}
