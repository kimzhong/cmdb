import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomService) {}

  @Get()
  list() { return this.service.listRooms(); }

  @Post()
  create(@Body() dto: any) { return this.service.createRoom(dto); }

  @Get(':id')
  get(@Param('id') id: string) { return this.service.getRoom(id); }

  @Get(':id/cabinets')
  listCabinets(@Param('id') id: string) { return this.service.listCabinets(id); }

  @Post(':id/cabinets')
  createCabinet(@Param('id') id: string, @Body() dto: any) { return this.service.createCabinet(id, dto); }
}

@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly service: RoomService) {}

  @Get(':id')
  get(@Param('id') id: string) { return this.service.getCabinet(id); }

  @Get(':id/units')
  listUnits(@Param('id') id: string) { return this.service.listUnits(id); }

  @Post(':id/allocate')
  allocate(@Param('id') id: string, @Body() dto: { startU: number; heightU: number; resourceId: string }) {
    return this.service.allocateUnit(id, dto.startU, dto.heightU, dto.resourceId);
  }

  @Post(':id/deallocate')
  deallocate(@Param('id') id: string, @Body() dto: { startU: number }) {
    return this.service.deallocateUnit(id, dto.startU);
  }
}
