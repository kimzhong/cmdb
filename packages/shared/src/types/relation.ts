/**
 * 关系 BC 共享类型
 */

/** 关系基数 */
export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M';

/** 关系实例的两端类型 */
export type RelationEndpointType = 'resource' | 'app' | 'business' | 'subnet' | 'cabinet';

/** 关系实例的状态 */
export type RelationStatus = 'active' | 'pending' | 'archived';

/** 系统预置关系类型(启动时 seed) */
export enum RelationTypeCode {
  DEPENDS_ON = 'depends_on',
  RUNS_ON = 'runs_on',
  DEPLOYED_IN = 'deployed_in',
  CONNECTS_TO = 'connects_to',
  CONTAINS = 'contains',
  MOUNTED_ON = 'mounted_on',
  REPLICA_OF = 'replica_of',
  OWNS = 'owns',
  USES = 'uses',
  BELONGS_TO = 'belongs_to',
}

/** 系统预置关系类型(展示用映射) */
export const SystemRelationTypes: {
  code: string;
  name: string;
  inverseCode: string;
  inverseName: string;
  cardinality: Cardinality;
  sourceConstraint?: RelationEndpointType | 'any';
  targetConstraint?: RelationEndpointType | 'any';
  bidirectional: boolean;
  icon?: string;
  color?: string;
}[] = [
  { code: 'depends_on',   name: '依赖于',     inverseCode: 'depended_by',   inverseName: '被依赖于',     cardinality: '1:N', bidirectional: false, color: '#ff7875' },
  { code: 'runs_on',      name: '运行在',     inverseCode: 'hosted_by',     inverseName: '运行了',       cardinality: 'N:1', sourceConstraint: 'resource', targetConstraint: 'resource', bidirectional: false, color: '#52c41a' },
  { code: 'deployed_in', name: '部署于',     inverseCode: 'deployment_of', inverseName: '部署了',       cardinality: 'N:1', sourceConstraint: 'resource', targetConstraint: 'resource', bidirectional: false, color: '#1890ff' },
  { code: 'connects_to', name: '连接到',     inverseCode: 'connected_from', inverseName: '被连接到',   cardinality: 'N:M', bidirectional: true, color: '#13c2c2' },
  { code: 'contains',    name: '包含',       inverseCode: 'contained_in',  inverseName: '属于',         cardinality: '1:N', bidirectional: false, color: '#722ed1' },
  { code: 'mounted_on',  name: '挂载于',     inverseCode: 'mounts',        inverseName: '挂载了',       cardinality: 'N:1', bidirectional: false, color: '#fa8c16' },
  { code: 'replica_of',  name: '是副本',     inverseCode: 'replicated_by', inverseName: '副本有',       cardinality: 'N:M', bidirectional: true, color: '#eb2f96' },
  { code: 'owns',        name: '拥有',       inverseCode: 'owned_by',      inverseName: '属于',         cardinality: '1:N', bidirectional: false, color: '#faad14' },
  { code: 'uses',        name: '使用',       inverseCode: 'used_by',       inverseName: '被使用',       cardinality: 'N:M', bidirectional: true, color: '#a0d911' },
  { code: 'belongs_to',  name: '属于',       inverseCode: 'has_member',    inverseName: '包含',         cardinality: 'N:1', bidirectional: false, color: '#2f54eb' },
];
