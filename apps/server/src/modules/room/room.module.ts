/**
 * Room 限界上下文 (F9)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema, Cabinet, CabinetSchema, RackUnit, RackUnitSchema } from './infra/room.schema';
import { RoomService } from './application/room.service';
import { RoomsController, CabinetsController } from './application/room.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Cabinet.name, schema: CabinetSchema },
      { name: RackUnit.name, schema: RackUnitSchema },
    ]),
  ],
  controllers: [RoomsController, CabinetsController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
