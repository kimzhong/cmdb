import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { RelationsService, CreateRelationDto } from './relations.service';
import { EndpointType } from '../domain/relation.aggregate';

@Controller('relations')
export class RelationsController {
  constructor(private readonly service: RelationsService) {}

  @Get()
  list(@Query() q: any) {
    const filter: any = {};
    if (q.sourceId) filter.sourceId = q.sourceId;
    if (q.targetId) filter.targetId = q.targetId;
    if (q.sourceType) filter.sourceType = q.sourceType;
    if (q.targetType) filter.targetType = q.targetType;
    if (q.relationType) filter.relationType = q.relationType;
    if (q.status) filter.status = q.status;
    return this.service.findAll(filter);
  }

  @Get('graph')
  graph(
    @Query('rootId') rootId: string,
    @Query('rootType') rootType: EndpointType,
    @Query('direction') direction: 'up' | 'down' | 'both' = 'both',
    @Query('maxDepth') maxDepth: string = '3',
    @Query('relationTypes') relationTypes?: string,
  ) {
    return this.service.traverse(rootId, rootType, {
      direction,
      maxDepth: parseInt(maxDepth, 10) || 3,
      relationTypes: relationTypes ? relationTypes.split(',') : undefined,
      includeStart: true,
    });
  }

  @Get('path')
  path(
    @Query('fromId') fromId: string,
    @Query('fromType') fromType: EndpointType,
    @Query('toId') toId: string,
    @Query('toType') toType: EndpointType,
    @Query('maxDepth') maxDepth: string = '6',
  ) {
    return this.service.findPath(fromId, fromType, toId, toType, {
      maxDepth: parseInt(maxDepth, 10) || 6,
    });
  }

  @Get('impact')
  impact(
    @Query('rootId') rootId: string,
    @Query('rootType') rootType: EndpointType,
    @Query('maxDepth') maxDepth: string = '3',
  ) {
    return this.service.impactAnalysis(rootId, rootType, {
      maxDepth: parseInt(maxDepth, 10) || 3,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateRelationDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
