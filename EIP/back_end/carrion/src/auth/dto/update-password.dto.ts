import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsOptional()
  @MinLength(8)
  @ApiProperty({
    example: 'CurrentSecureP@ssw0rd!',
    description: 'The current user password (at least 8 characters)',
  })
  current: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    example: 'NewSecureP@ssw0rd!',
    description: 'The new user password (at least 8 characters)',
  })
  new: string;
}
