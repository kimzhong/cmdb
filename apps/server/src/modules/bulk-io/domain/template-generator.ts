/**
 * 模板生成器
 * 给定 model 定义,生成 Excel/CSV 导入模板
 */
import { ModelDef } from '../../meta-model/models/schemas/model.schema';

export interface TemplateColumn {
  code: string;
  name: string;
  required: boolean;
  type: string;
  example: string;
  enumValues?: string[];
}

/**
 * 收集 model 的所有字段(去掉系统字段 lifecycle/deletedAt/createdBy 等)
 * 生成模板列
 */
export function generateTemplateColumns(def: ModelDef): TemplateColumn[] {
  const reserved = new Set(['lifecycle', 'deletedAt', 'deletedBy', 'createdBy', 'updatedBy', 'pendingApprovalId']);
  return (def.fields ?? [])
    .filter((f) => !reserved.has(f.uid))
    .map((f) => ({
      code: f.uid,
      name: f.name,
      required: f.required ?? false,
      type: f.type,
      example: exampleFor(f.type, f.options?.map((o) => o.key)),
      enumValues: f.options?.map((o) => o.key),
    }));
}

function exampleFor(type: string, enumValues?: string[]): string {
  switch (type) {
    case 'number':   return '42';
    case 'boolean':  return 'true';
    case 'date':     return '2026-01-01';
    case 'select':   return enumValues?.[0] ?? '';
    case 'password': return '****';
    case 'json':     return '{}';
    default:         return '示例文本';
  }
}

/**
 * 渲染 CSV 模板(简单实现,无依赖)
 */
export function renderCsvTemplate(columns: TemplateColumn[]): string {
  const header = columns.map((c) => c.name + (c.required ? ' *' : '')).join(',');
  const row = columns.map((c) => c.example).join(',');
  // 加注释行(以 # 开头)
  const colDesc = '# 列: ' + columns.map((c) => `${c.code}(${c.type}${c.required ? ',必填' : ''})`).join(' | ');
  return `${colDesc}\n${header}\n${row}\n`;
}
