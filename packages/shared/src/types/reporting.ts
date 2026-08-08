/**
 * 报表 / 仪表盘共享类型
 */

/** 资源分布(按状态/模型) */
export interface ResourceDistribution {
  group: string;       // 'in_use' / 'linux-server' / ...
  count: number;
  percent: number;
}

/** 资源变化趋势 */
export interface ChangeTrendPoint {
  date: string;        // 'YYYY-MM-DD'
  created: number;
  updated: number;
  deleted: number;
}

/** 发现任务执行统计 */
export interface DiscoveryStats {
  taskId: string;
  taskName: string;
  protocol: string;
  totalRuns: number;
  successRate: number;
  newResourcesLast30d: number;
  conflictsLast30d: number;
}

/** IPAM 使用率 */
export interface IpamUsageReport {
  subnetId: string;
  cidr: string;
  total: number;
  allocated: number;
  reserved: number;
  available: number;
  utilizationPercent: number;
}

/** 审批待办统计 */
export interface ApprovalPendingStats {
  byType: { type: string; count: number }[];
  byStep: { step: number; count: number }[];
  total: number;
  oldestPendingAt?: string;
}

/** 仪表盘总览 */
export interface DashboardSummary {
  totalResources: number;
  totalApps: number;
  totalRelations: number;
  pendingApprovals: number;
  failedDiscoveryLast24h: number;
  ipamUtilization: number;
  lifecycleDistribution: ResourceDistribution[];
  changeTrendLast7d: ChangeTrendPoint[];
}
