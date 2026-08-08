import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ModelTemplatesService } from './model-templates.service';

@Controller('api/model-templates')
export class ModelTemplatesController {
  constructor(private readonly service: ModelTemplatesService) {}

  @Get()
  list() { return this.service.list(); }

  @Get(':code')
  get(@Param('code') code: string) { return this.service.get(code); }

  @Post(':code/import')
  import(@Param('code') code: string, @Body() dto: { actor: string }) {
    return this.service.importAsModel(code, dto.actor);
  }
}
