/**
 * Bulk-IO 限界上下文 (F6)
 *
 * 责任:
 *  - 批量导入 (ImportJob: 上传 Excel/CSV -> 校验 -> 入库)
 *  - 批量导出 (ExportJob: 过滤 -> 生成 Excel/CSV -> 下载链接)
 *  - 模板下载
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class BulkIoModule {}
