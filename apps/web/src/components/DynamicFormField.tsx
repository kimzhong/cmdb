import { Form, Input, InputNumber, DatePicker, Select } from 'antd';
import { FieldType } from '@cmdb/shared';
import type { FieldDef } from '@/api/models';
import dayjs, { type Dayjs } from 'dayjs';

interface Props {
  field: FieldDef;
}

/**
 * 6 种字段类型 → 6 个渲染器（参考 readme §4.1.5）
 *  - string   → Input
 *  - number   → InputNumber
 *  - date     → DatePicker
 *  - select   → Select (K-V)
 *  - password → Input.Password（明文提交，server 端加密）
 *  - relation → 占位 Select（阶段一不做完整关联选择器）
 */
export function DynamicFormField({ field }: Props) {
  const commonRules = field.required
    ? [{ required: true, message: `${field.name} 必填` }]
    : [];

  switch (field.type) {
    case FieldType.String: {
      const rules: unknown[] = [...commonRules];
      if (field.regex) {
        rules.push({
          pattern: new RegExp(field.regex),
          message: `格式不符合 ${field.regex}`,
        });
      }
      return (
        <Form.Item
          key={field.uid}
          label={field.name}
          name={field.uid}
          rules={rules as never[]}
          extra={field.builtin ? '内置字段' : undefined}
        >
          <Input placeholder={`请输入 ${field.name}`} disabled={field.builtin && field.uid === 'uid'} />
        </Form.Item>
      );
    }

    case FieldType.Number:
      return (
        <Form.Item
          key={field.uid}
          label={field.name}
          name={field.uid}
          rules={commonRules as never[]}
        >
          <InputNumber style={{ width: '100%' }} placeholder={`请输入 ${field.name}`} />
        </Form.Item>
      );

    case FieldType.Date:
      return (
        <Form.Item
          key={field.uid}
          label={field.name}
          name={field.uid}
          rules={commonRules as never[]}
          getValueProps={(v) => ({ value: v ? dayjs(v as string) : undefined })}
          normalize={(v: Dayjs | null) => (v ? v.toISOString() : null)}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      );

    case FieldType.Select:
      return (
        <Form.Item
          key={field.uid}
          label={field.name}
          name={field.uid}
          rules={commonRules as never[]}
        >
          <Select
            placeholder={`请选择 ${field.name}`}
            options={(field.options ?? []).map((o) => ({ label: o.value, value: o.key }))}
          />
        </Form.Item>
      );

    case FieldType.Password:
      return (
        <Form.Item
          key={field.uid}
          label={field.name}
          name={field.uid}
          rules={commonRules as never[]}
          extra="提交后服务端会自动加密存储"
        >
          <Input.Password placeholder={`请输入 ${field.name}`} autoComplete="off" />
        </Form.Item>
      );

    case FieldType.Relation:
      return (
        <Form.Item
          key={field.uid}
          label={field.name}
          name={field.uid}
          extra={`关系类型：${field.relationType ?? 'belongsTo'}（阶段一暂为文本输入）`}
        >
          <Input placeholder="目标资源 _id" />
        </Form.Item>
      );

    default:
      return null;
  }
}

/** 详情页用：把值格式化成可读文本 */
export function formatValue(field: FieldDef, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === FieldType.Password) {
    if (typeof value === 'string' && value.startsWith('enc:')) return '••••••（密文）';
    return '••••••';
  }
  if (field.type === FieldType.Select) {
    const opt = field.options?.find((o) => o.key === value);
    return opt?.value ?? String(value);
  }
  if (field.type === FieldType.Date) {
    return new Date(value as string).toLocaleString('zh-CN');
  }
  if (field.type === FieldType.Relation && field.relationType === 'connects' && Array.isArray(value)) {
    return value.length ? `${value.length} 项` : '—';
  }
  return String(value);
}

/**
 * 关系字段专用渲染：详情页里把关联资源 id 渲染成可点击链接
 * （readme §4.2.3 重要）
 *  - belongsTo: 单值 → 链接到 /resources/<targetModelUid>/<id>
 *  - connects:  数组 → 每个 id 一个链接
 */
export function RelationValue({
  field,
  value,
}: {
  field: FieldDef;
  value: unknown;
}) {
  if (!field.targetModelUid) {
    // 没指定目标模型，回退到普通文本
    return <>{formatValue(field, value)}</>;
  }
  const target = field.targetModelUid;

  if (field.relationType === 'connects' && Array.isArray(value)) {
    if (value.length === 0) return <>—</>;
    return (
      <span>
        {value.map((id, i) => (
          <span key={String(id)}>
            <a href={`/resources/${target}/${id}`} target="_blank" rel="noreferrer">
              {String(id)}
            </a>
            {i < value.length - 1 ? ', ' : ''}
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === 'string' && value) {
    return (
      <a href={`/resources/${target}/${value}`} target="_blank" rel="noreferrer">
        {value}
      </a>
    );
  }
  return <>—</>;
}
