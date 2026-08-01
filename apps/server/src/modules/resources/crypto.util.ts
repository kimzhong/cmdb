import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM 推荐 12 字节

/** 从 hex 字符串获取 32 字节 key，启动时已校验过长度 */
function getKey(): Buffer {
  const hex = process.env.CMDB_FIELD_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('CMDB_FIELD_ENC_KEY 未配置或长度错误');
  }
  return Buffer.from(hex, 'hex');
}

/** 加密：返回 base64(iv + ciphertext + tag) */
export function encryptPassword(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString('base64');
}

/** 解密：输入是 encryptPassword 的输出 */
export function decryptPassword(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(IV_LEN, buf.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
