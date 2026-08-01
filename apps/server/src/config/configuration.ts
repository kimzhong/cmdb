/**
 * 启动期环境变量校验。
 * 失败时直接抛错并阻止 Nest 启动。
 */
export function validateConfig(config: Record<string, unknown>) {
  const required: Array<[string, string]> = [
    ['MONGODB_URI', 'string'],
    ['CMDB_FIELD_ENC_KEY', 'string'],
  ];

  for (const [key, type] of required) {
    const val = config[key];
    if (val === undefined || val === null || val === '') {
      throw new Error(`Missing required env var: ${key}`);
    }
    if (type === 'string' && typeof val !== 'string') {
      throw new Error(`Env var ${key} must be a string`);
    }
  }

  if (
    typeof config.CMDB_FIELD_ENC_KEY === 'string' &&
    config.CMDB_FIELD_ENC_KEY.length !== 64
  ) {
    throw new Error('CMDB_FIELD_ENC_KEY must be a 32-byte hex string (64 chars)');
  }

  return config;
}
