/**
 * 业务错误码
 *
 * 规则：
 *  - 0           : 成功
 *  - 1xxx        : 通用 / 资源
 *  - 2xxx        : 资源生命周期
 *  - 3xxx        : 关系
 *  - 4xxx        : 审批
 *  - 5xxx        : 权限
 *  - 6xxx        : IPAM / 机房
 *  - 7xxx        : 自动发现
 *  - 8xxx        : 导入导出
 *  - 9xxx        : 鉴权 / 其他
 */
export enum ErrorCode {
  SUCCESS = 0,

  // 1xxx 通用
  NOT_FOUND = 1001,
  ALREADY_EXISTS = 1002,
  VALIDATION_FAILED = 1003,
  INVALID_INPUT = 1004,
  INTERNAL_ERROR = 1500,

  // 2xxx 资源生命周期
  LIFECYCLE_INVALID_TRANSITION = 2001,
  RESOURCE_DELETED = 2002,
  RESOURCE_RETIRED = 2003,
  RESOURCE_IN_USE = 2004,

  // 3xxx 关系
  RELATION_CYCLE = 3001,
  RELATION_TYPE_NOT_FOUND = 3002,
  RELATION_TYPE_IN_USE = 3003,
  RELATION_NOT_FOUND = 3004,
  RELATION_DUPLICATE = 3005,
  RELATION_CONSTRAINT_VIOLATION = 3006,

  // 4xxx 审批
  APPROVAL_REQUIRED = 4001,
  APPROVAL_NOT_FOUND = 4002,
  APPROVAL_EXPIRED = 4003,
  APPROVAL_ALREADY_DECIDED = 4004,
  APPROVAL_PERMISSION_DENIED = 4005,
  APPROVAL_POLICY_NOT_FOUND = 4006,

  // 5xxx 权限
  PERMISSION_DENIED = 5001,
  PERMISSION_NOT_FOUND = 5002,
  PERMISSION_CONFLICT = 5003,

  // 6xxx IPAM / 机房
  IPAM_SUBNET_NOT_FOUND = 6001,
  IPAM_IP_NOT_FOUND = 6002,
  IPAM_IP_CONFLICT = 6003,
  IPAM_IP_NOT_AVAILABLE = 6004,
  IPAM_SUBNET_OVERLAP = 6005,
  IPAM_INVALID_CIDR = 6006,
  ROOM_NOT_FOUND = 6101,
  CABINET_NOT_FOUND = 6102,
  RACK_UNIT_OCCUPIED = 6103,
  RACK_UNIT_OUT_OF_RANGE = 6104,

  // 7xxx 自动发现
  DISCOVERY_TASK_NOT_FOUND = 7001,
  DISCOVERY_RUN_FAILED = 7002,
  DISCOVERY_CREDENTIAL_INVALID = 7003,
  DISCOVERY_PROTOCOL_NOT_SUPPORTED = 7004,

  // 8xxx 导入导出
  IMPORT_FILE_INVALID = 8001,
  IMPORT_ROW_VALIDATION_FAILED = 8002,
  IMPORT_JOB_NOT_FOUND = 8003,
  EXPORT_JOB_NOT_FOUND = 8101,

  // 9xxx 鉴权
  AUTH_FAILED = 9001,
  AUTH_TOKEN_EXPIRED = 9002,
  AUTH_USER_DISABLED = 9003,
}

/** 中文错误消息映射 */
export const ErrorCodeMessages: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '成功',

  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.ALREADY_EXISTS]: '资源已存在',
  [ErrorCode.VALIDATION_FAILED]: '数据校验失败',
  [ErrorCode.INVALID_INPUT]: '非法输入',
  [ErrorCode.INTERNAL_ERROR]: '内部错误',

  [ErrorCode.LIFECYCLE_INVALID_TRANSITION]: '非法的状态变更',
  [ErrorCode.RESOURCE_DELETED]: '资源已删除',
  [ErrorCode.RESOURCE_RETIRED]: '资源已退役',
  [ErrorCode.RESOURCE_IN_USE]: '资源正在使用',

  [ErrorCode.RELATION_CYCLE]: '关系会形成环',
  [ErrorCode.RELATION_TYPE_NOT_FOUND]: '关系类型不存在',
  [ErrorCode.RELATION_TYPE_IN_USE]: '关系类型正在使用',
  [ErrorCode.RELATION_NOT_FOUND]: '关系不存在',
  [ErrorCode.RELATION_DUPLICATE]: '关系已存在',
  [ErrorCode.RELATION_CONSTRAINT_VIOLATION]: '关系约束冲突',

  [ErrorCode.APPROVAL_REQUIRED]: '此操作需要审批',
  [ErrorCode.APPROVAL_NOT_FOUND]: '审批工单不存在',
  [ErrorCode.APPROVAL_EXPIRED]: '审批工单已过期',
  [ErrorCode.APPROVAL_ALREADY_DECIDED]: '审批已决定',
  [ErrorCode.APPROVAL_PERMISSION_DENIED]: '无权审批此工单',
  [ErrorCode.APPROVAL_POLICY_NOT_FOUND]: '审批策略不存在',

  [ErrorCode.PERMISSION_DENIED]: '权限不足',
  [ErrorCode.PERMISSION_NOT_FOUND]: '权限定义不存在',
  [ErrorCode.PERMISSION_CONFLICT]: '权限定义冲突',

  [ErrorCode.IPAM_SUBNET_NOT_FOUND]: '子网不存在',
  [ErrorCode.IPAM_IP_NOT_FOUND]: 'IP 地址不存在',
  [ErrorCode.IPAM_IP_CONFLICT]: 'IP 地址冲突',
  [ErrorCode.IPAM_IP_NOT_AVAILABLE]: 'IP 地址不可用',
  [ErrorCode.IPAM_SUBNET_OVERLAP]: '子网范围重叠',
  [ErrorCode.IPAM_INVALID_CIDR]: 'CIDR 格式错误',
  [ErrorCode.ROOM_NOT_FOUND]: '机房不存在',
  [ErrorCode.CABINET_NOT_FOUND]: '机柜不存在',
  [ErrorCode.RACK_UNIT_OCCUPIED]: 'U 位已被占用',
  [ErrorCode.RACK_UNIT_OUT_OF_RANGE]: 'U 位超出范围',

  [ErrorCode.DISCOVERY_TASK_NOT_FOUND]: '发现任务不存在',
  [ErrorCode.DISCOVERY_RUN_FAILED]: '发现执行失败',
  [ErrorCode.DISCOVERY_CREDENTIAL_INVALID]: '发现凭证无效',
  [ErrorCode.DISCOVERY_PROTOCOL_NOT_SUPPORTED]: '不支持的发现协议',

  [ErrorCode.IMPORT_FILE_INVALID]: '导入文件无效',
  [ErrorCode.IMPORT_ROW_VALIDATION_FAILED]: '导入行校验失败',
  [ErrorCode.IMPORT_JOB_NOT_FOUND]: '导入任务不存在',
  [ErrorCode.EXPORT_JOB_NOT_FOUND]: '导出任务不存在',

  [ErrorCode.AUTH_FAILED]: '认证失败',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.AUTH_USER_DISABLED]: '用户已禁用',
};
