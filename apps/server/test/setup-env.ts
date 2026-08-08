/**
 * Jest 全局 setup - 跑在测试文件加载前
 * 设置环境变量,让 Nest/Mongoose 进入测试模式
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/cmdb_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-jest-only-not-for-prod';
process.env.CMDB_FIELD_ENC_KEY = process.env.CMDB_FIELD_ENC_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PORT = '0'; // 任意端口
