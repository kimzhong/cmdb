import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RelationTypesService, CreateRelationTypeDto } from './relation-types.service';

@Controller('relation-types')
export class RelationTypesController {
  constructor(private readonly service: RelationTypesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateRelationTypeDto) {
    return this.service.create(dto);
  }

  @Delete(':code')
  @HttpCode(204)
  async remove(@Param('code') code: string) {
    await this.service.remove(code);
  }
}
