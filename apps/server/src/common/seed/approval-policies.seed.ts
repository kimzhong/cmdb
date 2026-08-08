/**
 * 审批策略 seed 数据
 * Sprint 3 完成 approval_policies schema 后启动时自动 seed
 */
export interface ApprovalPolicySeed {
  name: string;
  description: string;
  appliesTo: { type: 'resource' | 'relation' | 'subnet'; modelUid?: string };
  trigger: string;
  conditions: any[];
  steps: { name: string; approverType: 'role' | 'user' | 'field_owner'; approverValue: string; timeoutHours: number }[];
  enabled: boolean;
  priority: number;
  isSystem: true;
}

export const APPROVAL_POLICY_SEEDS: ApprovalPolicySeed[] = [
  {
    name: '资源删除需 admin 审批',
    description: '任何资源删除前需要 admin 审批',
    appliesTo: { type: 'resource' },
    trigger: 'delete_resource',
    conditions: [],
    steps: [
      { name: 'admin 审批', approverType: 'role', approverValue: 'admin', timeoutHours: 48 },
    ],
    enabled: true,
    priority: 100,
    isSystem: true as const,
  },
  {
    name: '生产环境资源变更需 owner+admin 审批',
    description: '环境为 production 的资源变更需要 owner 和 admin 双签',
    appliesTo: { type: 'resource' },
    trigger: 'update_resource',
    conditions: [{ field: 'environment', op: 'eq', value: 'production' }],
    steps: [
      { name: '资源 owner 审批', approverType: 'field_owner', approverValue: 'owner', timeoutHours: 24 },
      { name: 'admin 审批', approverType: 'role', approverValue: 'admin', timeoutHours: 48 },
    ],
    enabled: true,
    priority: 90,
    isSystem: true as const,
  },
  {
    name: 'admin 直接操作豁免',
    description: 'admin 用户的写操作免审批（最高优先级,deny 时不匹配）',
    appliesTo: { type: 'resource' },
    trigger: 'update_resource',
    conditions: [{ field: '_userRole', op: 'eq', value: 'admin' }],
    steps: [],
    enabled: true,
    priority: 1000,
    isSystem: true as const,
  },
];
