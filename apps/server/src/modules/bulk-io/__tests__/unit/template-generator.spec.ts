/**
 * Template Generator 单元测试
 */
import { ModelDef, FieldType } from '../../../meta-model/models/schemas/model.schema';
import { generateTemplateColumns, renderCsvTemplate } from '../../domain/template-generator';

const modelDef: ModelDef = {
  uid: 'linux-server',
  name: 'Linux 服务器',
  fields: [
    { uid: 'hostname', name: '主机名', type: FieldType.String, required: true } as any,
    { uid: 'Cpu',     name: 'CPU 核数', type: FieldType.Number, required: true } as any,
    { uid: 'Env',     name: '环境',     type: FieldType.Select, options: [{ key: 'production', label: '生产' }, { key: 'dev', label: '开发' }] } as any,
    { uid: 'lifecycle', name: '生命周期', type: 'json' as any } as any, // 应被过滤
  ],
} as any;

describe('Template generator', () => {
  it('generateTemplateColumns: filters out system fields', () => {
    const cols = generateTemplateColumns(modelDef);
    expect(cols.map((c) => c.code)).toEqual(['hostname', 'Cpu', 'Env']);
  });

  it('generateTemplateColumns: marks required correctly', () => {
    const cols = generateTemplateColumns(modelDef);
    expect(cols[0].required).toBe(true);
    expect(cols[2].required).toBe(false);
  });

  it('generateTemplateColumns: includes enumValues for Select', () => {
    const cols = generateTemplateColumns(modelDef);
    expect(cols[2].enumValues).toEqual(['production', 'dev']);
  });

  it('renderCsvTemplate: includes header, example, comment', () => {
    const cols = generateTemplateColumns(modelDef);
    const csv = renderCsvTemplate(cols);
    expect(csv).toContain('# 列:');
    expect(csv).toContain('主机名 *');
    expect(csv).toContain('示例文本'); // default
    expect(csv).toContain('production'); // example for select
  });
});
