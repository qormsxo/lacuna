import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteArticlesRequestDto {
  @ApiProperty({ type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class DeleteArticlesResponseDto {
  @ApiProperty()
  deletedArticleCount!: number;

  @ApiProperty()
  deletedFactCount!: number;

  @ApiProperty()
  deletedHypothesisCount!: number;
}
