/**
 * 预置模型库 seed 数据
 * Sprint 12 完成 model_templates schema 后启动时自动 seed
 */

interface FieldDef {
  code: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  enumValues?: string[];
  validators?: { min?: number; max?: number; pattern?: string };
  groupName?: string;
}

interface ModelTemplateSeed {
  code: string;
  name: string;
  category: 'compute' | 'network' | 'storage' | 'database' | 'middleware' | 'application' | 'service';
  fields: FieldDef[];
  isSystem: true;
}

export const MODEL_TEMPLATE_SEEDS: ModelTemplateSeed[] = [
  {
    code: 'linux-server',
    name: 'Linux 服务器',
    category: 'compute',
    isSystem: true as const,
    fields: [
      { code: 'hostname', name: '主机名', type: 'string', required: true, unique: true, groupName: '基本信息' },
      { code: 'Ip',      name: 'IP',      type: 'string', required: true, unique: true, groupName: '网络' },
      { code: 'Cpu',     name: 'CPU 核数', type: 'number', required: true, validators: { min: 1, max: 256 }, groupName: '硬件' },
      { code: 'Memory',  name: '内存 MB', type: 'number', required: true, validators: { min: 512 }, groupName: '硬件' },
      { code: 'Disk',    name: '磁盘 GB', type: 'number', required: false, groupName: '硬件' },
      { code: 'Os',      name: '操作系统', type: 'string', required: false, groupName: '基本信息' },
      { code: 'Env',     name: '环境',     type: 'enum',   required: true, enumValues: ['production', 'staging', 'dev', 'test'], groupName: '基本信息' },
      { code: 'Owner',   name: '负责人',   type: 'string', required: false, groupName: '管理' },
      { code: 'Status',  name: '状态',     type: 'enum',   required: false, enumValues: ['online', 'offline', 'maintaining'], defaultValue: 'online', groupName: '管理' },
    ],
  },
  {
    code: 'mysql',
    name: 'MySQL 数据库',
    category: 'database',
    isSystem: true as const,
    fields: [
      { code: 'version',  name: '版本',     type: 'string', required: true, groupName: '基本信息' },
      { code: 'Port',     name: '端口',     type: 'number', required: true, defaultValue: 3306, groupName: '网络' },
      { code: 'DataDir',  name: '数据目录', type: 'string', required: false, groupName: '配置' },
      { code: 'MaxConn',  name: '最大连接', type: 'number', required: false, groupName: '配置' },
      { code: 'ReplRole', name: '复制角色', type: 'enum',   required: false, enumValues: ['master', 'slave', 'standalone'], defaultValue: 'standalone', groupName: '配置' },
    ],
  },
  {
    code: 'redis',
    name: 'Redis',
    category: 'database',
    isSystem: true as const,
    fields: [
      { code: 'version',  name: '版本',     type: 'string', required: true, groupName: '基本信息' },
      { code: 'Port',     name: '端口',     type: 'number', required: true, defaultValue: 6379, groupName: '网络' },
      { code: 'Mode',     name: '模式',     type: 'enum',   required: true, enumValues: ['standalone', 'sentinel', 'cluster'], groupName: '配置' },
      { code: 'MaxMemory', name: '最大内存 MB', type: 'number', required: false, groupName: '配置' },
    ],
  },
  {
    code: 'nginx',
    name: 'Nginx',
    category: 'middleware',
    isSystem: true as const,
    fields: [
      { code: 'version', name: '版本',     type: 'string', required: true, groupName: '基本信息' },
      { code: 'Port',    name: '端口',     type: 'number', required: true, defaultValue: 80, groupName: '网络' },
      { code: 'WorkerProcesses', name: 'Worker 数', type: 'number', required: false, groupName: '配置' },
    ],
  },
  {
    code: 'application',
    name: '业务应用',
    category: 'application',
    isSystem: true as const,
    fields: [
      { code: 'code',      name: '应用编码', type: 'string', required: true, unique: true, groupName: '基本信息' },
      { code: 'Language',  name: '开发语言', type: 'enum',   required: false, enumValues: ['Java', 'Go', 'Python', 'Node', 'Other'], groupName: '基本信息' },
      { code: 'RepoUrl',   name: '代码仓库', type: 'string', required: false, groupName: '基本信息' },
      { code: 'Owner',     name: '负责人',   type: 'string', required: false, groupName: '管理' },
      { code: 'Env',       name: '环境',     type: 'enum',   required: false, enumValues: ['production', 'staging', 'dev', 'test'], groupName: '管理' },
    ],
  },
  {
    code: 'docker-container',
    name: 'Docker 容器',
    category: 'compute',
    isSystem: true as const,
    fields: [
      { code: 'ContainerId', name: '容器 ID', type: 'string', required: true, unique: true, groupName: '基本信息' },
      { code: 'Image',       name: '镜像',     type: 'string', required: true, groupName: '基本信息' },
      { code: 'Status',      name: '状态',     type: 'enum',   required: false, enumValues: ['running', 'stopped', 'paused'], defaultValue: 'running', groupName: '状态' },
    ],
  },
  {
    code: 'k8s-pod',
    name: 'Kubernetes Pod',
    category: 'compute',
    isSystem: true as const,
    fields: [
      { code: 'Namespace', name: '命名空间', type: 'string', required: true, groupName: '基本信息' },
      { code: 'Node',      name: '所在节点', type: 'string', required: false, groupName: '调度' },
      { code: 'Status',    name: '状态',     type: 'enum',   required: false, enumValues: ['Running', 'Pending', 'Failed', 'Succeeded'], defaultValue: 'Running', groupName: '状态' },
    ],
  },
  {
    code: 'network-switch',
    name: '网络交换机',
    category: 'network',
    isSystem: true as const,
    fields: [
      { code: 'Model',    name: '型号',     type: 'string', required: true, groupName: '基本信息' },
      { code: 'MgmtIp',   name: '管理 IP',  type: 'string', required: true, unique: true, groupName: '网络' },
      { code: 'Ports',    name: '端口数',   type: 'number', required: true, groupName: '硬件' },
      { code: 'Vendor',   name: '厂商',     type: 'enum',   required: false, enumValues: ['Cisco', 'Huawei', 'H3C', 'Ruijie', 'Other'], groupName: '基本信息' },
    ],
  },
  {
    code: 'firewall',
    name: '防火墙',
    category: 'network',
    isSystem: true as const,
    fields: [
      { code: 'Model',  name: '型号',   type: 'string', required: true, groupName: '基本信息' },
      { code: 'MgmtIp', name: '管理 IP', type: 'string', required: true, unique: true, groupName: '网络' },
      { code: 'Vendor', name: '厂商',   type: 'enum',   required: false, enumValues: ['Cisco', 'Huawei', 'H3C', 'Juniper', 'Other'], groupName: '基本信息' },
    ],
  },
  {
    code: 'tomcat',
    name: 'Tomcat',
    category: 'middleware',
    isSystem: true as const,
    fields: [
      { code: 'version', name: '版本',     type: 'string', required: true, groupName: '基本信息' },
      { code: 'Port',    name: 'HTTP 端口', type: 'number', required: true, defaultValue: 8080, groupName: '网络' },
      { code: 'JavaOpts', name: 'JVM 参数', type: 'string', required: false, groupName: '配置' },
    ],
  },
];
