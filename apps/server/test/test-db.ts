/**
 * 测试数据库帮助器
 *
 * 策略:优先用环境变量 MONGODB_URI + 随机 db name,各测试隔离。
 * 如需内存 mongo,安装 mongodb-memory-server 并设 USE_MEMORY_DB=true。
 *
 * 用法:
 *   beforeAll(async () => { await connectTestDb(); });
 *   afterAll(async () => { await disconnectTestDb(); });
 *   afterEach(async () => { await clearDb(); });
 */
import mongoose, { Connection } from 'mongoose';

let activeConn: Connection | null = null;

export async function connectTestDb(): Promise<Connection> {
  const dbName = `cmdb_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const baseUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
  // 在 base uri 后面拼上 db name
  const sep = baseUri.includes('?') ? '&' : '/';
  const uri = baseUri.replace(/\/[^/]*(\?.*)?$/, (_m, qs) => `${sep === '/' ? '/' : ''}${dbName}${qs ?? ''}`);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  const conn = await mongoose.createConnection(uri).asPromise();
  activeConn = conn;
  return conn;
}

export async function disconnectTestDb(): Promise<void> {
  if (activeConn) {
    try {
      if (activeConn.readyState === 1) {
        await activeConn.dropDatabase();
      }
      await activeConn.close();
    } catch {
      /* ignore */
    }
    activeConn = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getTestConnection(): Connection {
  if (!activeConn) {
    throw new Error('Test DB not connected. Call connectTestDb() in beforeAll.');
  }
  return activeConn;
}

export async function clearDb(): Promise<void> {
  if (!activeConn) return;
  for (const key of Object.keys(activeConn.collections)) {
    await activeConn.collections[key].deleteMany({});
  }
}
