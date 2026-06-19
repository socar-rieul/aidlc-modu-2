import { IsString, MinLength } from 'class-validator';

export class LoginRequest {
  @IsString()
  @MinLength(1)
  storeId!: string;

  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

export class LoginResponse {
  jwt!: string;
  expiresAt!: string;
}
