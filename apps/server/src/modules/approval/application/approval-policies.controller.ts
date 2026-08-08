/**
 * Approval Policies 控制器
 */
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApprovalRepository } from '../infra/approval.repository';
import { ApprovalPolicy } from '@cmdb/shared/types/approval';

@Controller('approval-policies')
export class ApprovalPoliciesController {
  constructor(private readonly repo: ApprovalRepository) {}

  @Get()
  list() {
    return this.repo.listPolicies().then((docs) => docs.map((d) => ({ id: d._id.toString(), ...(d.toObject() as any) })));
  }

  @Post()
  async create(@Body() dto: any) {
    const doc = await this.repo.createPolicy(dto);
    return { id: doc._id.toString(), ...(doc.toObject() as any) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    const doc = await this.repo.updatePolicy(id, dto);
    if (!doc) return null;
    return { id: doc._id.toString(), ...(doc.toObject() as any) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.repo.deletePolicy(id);
  }
}
