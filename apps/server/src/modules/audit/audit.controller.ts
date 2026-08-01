import { Controller, Get, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditLog, AuditLogDocument } from './schemas/audit.schema';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  @Get('logs')
  @ApiOperation({ summary: '查询审计日志' })
  @ApiQuery({ name: 'username', required: false })
  @ApiQuery({ name: 'path', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(
    @Query('username') username?: string,
    @Query('path') path?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const q: Record<string, unknown> = {};
    if (username) q.username = username;
    if (path) q.path = { $regex: path, $options: 'i' };
    const p = Math.max(1, Number(page));
    const ps = Math.min(200, Math.max(1, Number(pageSize)));
    const [list, total] = await Promise.all([
      this.model.find(q).sort({ createdAt: -1 }).skip((p - 1) * ps).limit(ps).lean(),
      this.model.countDocuments(q),
    ]);
    return { list, total, page: p, pageSize: ps };
  }
}
