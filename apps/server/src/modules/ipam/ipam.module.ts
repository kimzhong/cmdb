/**
 * IPAM 限界上下文 (F8)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subnet, SubnetSchema, IpAddress, IpAddressSchema } from './infra/ipam.schema';
import { IpamService } from './application/ipam.service';
import { IpamController } from './application/ipam.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subnet.name, schema: SubnetSchema },
      { name: IpAddress.name, schema: IpAddressSchema },
    ]),
  ],
  controllers: [IpamController],
  providers: [IpamService],
  exports: [IpamService],
})
export class IpamModule {}
