/**
 * Bulk-IO REST 控制器
 */
import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BulkIoService } from './bulk-io.service';

@Controller('bulk-io')
export class BulkIoController {
  constructor(private readonly service: BulkIoService) {}

  // ===== Template =====
  @Get('templates/:modelUid')
  async getTemplate(@Param('modelUid') modelUid: string, @Res() res: Response) {
    const t = await this.service.getTemplate(modelUid);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${modelUid}-template.csv"`);
    res.send(t.csv);
  }

  @Get('templates/:modelUid/json')
  async getTemplateJson(@Param('modelUid') modelUid: string) {
    return this.service.getTemplate(modelUid);
  }

  // ===== Import =====
  @Post('imports')
  createImport(@Body() body: any) {
    return this.service.createImportJob({
      modelUid: body.modelUid,
      mode: body.mode ?? 'upsert',
      dryRun: !!body.dryRun,
      uploadedBy: body.uploadedBy,
      fileName: body.fileName ?? 'manual.json',
      fileSize: body.fileSize ?? 0,
      rows: body.rows ?? [],
      fieldMapping: body.fieldMapping,
    });
  }

  @Get('imports/:id')
  getImport(@Param('id') id: string) {
    return this.service.getImportJob(id);
  }

  @Get('imports')
  listImports(@Query('modelUid') modelUid?: string, @Query('status') status?: string) {
    return this.service.listImportJobs({ modelUid, status });
  }

  // ===== Export =====
  @Post('exports')
  createExport(@Body() body: { modelUid: string; format: 'xlsx' | 'csv' | 'json'; fields?: string[]; filters?: any; createdBy: string }) {
    return this.service.createExportJob(body);
  }

  @Get('exports/:id')
  getExport(@Param('id') id: string) {
    return this.service.getExportJob(id);
  }

  @Get('exports/:id/download')
  async downloadExport(@Param('id') id: string, @Res() res: Response) {
    const r = await this.service.downloadExport(id);
    const mime = r.format === 'json' ? 'application/json' : r.format === 'csv' ? 'text/csv' : 'text/markdown';
    res.setHeader('Content-Type', `${mime}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="${r.fileName}"`);
    res.send(r.content);
  }
}
