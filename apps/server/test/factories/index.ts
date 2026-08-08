/**
 * 测试数据工厂
 * 用 makeXxx() 创建测试对象,用 buildXxx() 批量创建
 */
import { LifecycleState, Action } from '@cmdb/shared/types';
import { ErrorCode } from '@cmdb/shared/types/error-code';

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(++counter).toString(36)}`;

/** User 工厂 */
export const makeUser = (overrides?: Partial<TestUser>): TestUser => ({
  id: nextId('u'),
  username: 'tester',
  password: 'hashed_password',
  roles: ['admin'],
  enabled: true,
  createdAt: new Date(),
  ...overrides,
});

export const makeAdmin = (overrides?: Partial<TestUser>): TestUser =>
  makeUser({ username: 'admin', roles: ['admin'], ...overrides });

export const makeOperator = (overrides?: Partial<TestUser>): TestUser =>
  makeUser({ username: 'op1', roles: ['operator'], ...overrides });

export const makeViewer = (overrides?: Partial<TestUser>): TestUser =>
  makeUser({ username: 'v1', roles: ['viewer'], ...overrides });

/** Resource 工厂(动态模型,测试用) */
export const makeResource = (overrides?: Partial<TestResource>): TestResource => ({
  id: nextId('r'),
  modelUid: 'linux-server',
  name: `srv-${counter}`,
  fields: { Cpu: 4, Memory: 8192, Env: 'dev' },
  lifecycle: { state: LifecycleState.IN_USE, enteredAt: new Date(), enteredBy: 'system' },
  deletedAt: null,
  createdBy: 'admin',
  createdAt: new Date(),
  ...overrides,
});

/** 软删除的资源 */
export const makeDeletedResource = (overrides?: Partial<TestResource>): TestResource =>
  makeResource({
    deletedAt: new Date(),
    deletedBy: 'admin',
    lifecycle: { state: LifecycleState.DELETED, enteredAt: new Date(), enteredBy: 'admin' },
    ...overrides,
  });

/** Relation 工厂 */
export const makeRelation = (overrides?: Partial<TestRelation>): TestRelation => ({
  id: nextId('rel'),
  sourceId: nextId('r'),
  sourceType: 'resource',
  targetId: nextId('r'),
  targetType: 'resource',
  relationType: 'depends_on',
  status: 'active',
  isAutoDiscovered: false,
  createdBy: 'admin',
  createdAt: new Date(),
  ...overrides,
});

/** Approval 工厂 */
export const makeApproval = (overrides?: Partial<TestApproval>): TestApproval => ({
  id: nextId('ap'),
  ticketNo: `AP-${Date.now()}-${counter.toString().padStart(5, '0')}`,
  type: 'delete_resource' as any,
  targetType: 'resource',
  targetId: nextId('r'),
  payload: {},
  requesterId: nextId('u'),
  requesterName: 'tester',
  policyId: nextId('pol'),
  currentStep: 0,
  totalSteps: 1,
  status: 'pending' as any,
  decisions: [],
  expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** Subnet 工厂 */
export const makeSubnet = (overrides?: Partial<TestSubnet>): TestSubnet => ({
  id: nextId('sn'),
  cidr: `10.${Math.floor(Math.random() * 255)}.0.0/24`,
  name: 'test-subnet',
  scope: 'test',
  environment: 'dev' as any,
  totalAddresses: 254,
  allocatedAddresses: 0,
  reservedAddresses: 0,
  tags: [],
  createdBy: 'admin',
  createdAt: new Date(),
  ...overrides,
});

/** 关联枚举 re-export 方便测试 */
export { LifecycleState, Action, ErrorCode };

// ============== 类型定义 ==============
export interface TestUser {
  id: string;
  username: string;
  password: string;
  roles: string[];
  enabled: boolean;
  createdAt: Date;
}

export interface TestResource {
  id: string;
  modelUid: string;
  name: string;
  fields: Record<string, any>;
  lifecycle: {
    state: LifecycleState;
    previousState?: LifecycleState;
    enteredAt: Date;
    enteredBy: string;
  };
  deletedAt: Date | null;
  deletedBy?: string;
  createdBy: string;
  updatedBy?: string;
  pendingApprovalId?: string;
  createdAt: Date;
}

export interface TestRelation {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationType: string;
  inverseRelationType?: string;
  attributes?: Record<string, any>;
  isAutoDiscovered: boolean;
  status: string;
  createdBy: string;
  createdAt: Date;
}

export interface TestApproval {
  id: string;
  ticketNo: string;
  type: string;
  targetType: string;
  targetId: string;
  payload: any;
  diff?: any;
  requesterId: string;
  requesterName: string;
  policyId: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  decisions: any[];
  expiresAt: Date;
  appliedAt?: Date;
  result?: { success: boolean; error?: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSubnet {
  id: string;
  cidr: string;
  name: string;
  parentId?: string;
  vlanId?: number;
  gateway?: string;
  dns?: string[];
  dhcpRange?: { start: string; end: string };
  scope: string;
  environment: 'production' | 'staging' | 'dev' | 'test' | 'office';
  totalAddresses: number;
  allocatedAddresses: number;
  reservedAddresses: number;
  tags: string[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
}
