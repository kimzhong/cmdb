// 字段类型定义

/** 6 种字段类型 */
export enum FieldType {
  String = 'string',
  Number = 'number',
  Date = 'date',
  Select = 'select',   // 下拉选项（K-V）
  Password = 'password',
  Relation = 'relation', // 关系
}

/** 关系类型 */
export enum RelationType {
  BelongsTo = 'belongsTo', // 从属 1:1
  Connects = 'connects',   // 连接 1:N / N:N
}

export interface FieldOption {
  key: string;
  value: string;
}

export interface FieldDef {
  id: string;
  uid: string;
  name: string;
  type: FieldType;
  required: boolean;
  builtin: boolean;
  regex?: string;          // 校验正则
  options?: FieldOption[]; // type=select
  relationType?: RelationType; // type=relation
  targetModelUid?: string; // type=relation
}
