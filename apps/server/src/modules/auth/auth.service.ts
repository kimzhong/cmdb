import { Injectable, OnModuleInit, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User, UserDocument, UserRole } from './schemas/user.schema';

const SECRET = process.env.CMDB_JWT_SECRET || 'cmdb-dev-secret-change-me';
const EXP = process.env.CMDB_JWT_EXP || '7d';

function hashPassword(p: string, salt = 'cmdb-static-salt'): string {
  return crypto.createHash('sha256').update(`${salt}:${p}`).digest('hex');
}
function verifyPassword(p: string, h: string): boolean {
  return hashPassword(p) === h;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  async onModuleInit() {
    // 内置 admin/admin
    const exists = await this.model.findOne({ username: 'admin' });
    if (!exists) {
      await this.model.create({
        username: 'admin',
        passwordHash: hashPassword('admin'),
        displayName: '系统管理员',
        role: UserRole.Admin,
        builtin: true,
      });
      this.logger.warn('已创建内置用户 admin/admin（请尽快改密码）');
    }
  }

  async login(username: string, password: string): Promise<{ token: string; user: { username: string; role: string; displayName?: string } }> {
    const u = await this.model.findOne({ username });
    if (!u || !verifyPassword(password, u.passwordHash)) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = jwt.sign(
      { sub: u._id.toString(), username: u.username, role: u.role },
      SECRET,
      { expiresIn: EXP as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
    return {
      token,
      user: { username: u.username, role: u.role, displayName: u.displayName },
    };
  }

  async changePassword(username: string, oldPwd: string, newPwd: string): Promise<void> {
    const u = await this.model.findOne({ username });
    if (!u || !verifyPassword(oldPwd, u.passwordHash)) throw new UnauthorizedException('原密码错误');
    u.passwordHash = hashPassword(newPwd);
    await u.save();
  }

  verifyToken(token: string): { sub: string; username: string; role: string } {
    try {
      return jwt.verify(token, SECRET) as { sub: string; username: string; role: string };
    } catch {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }

  async createUser(username: string, password: string, role: UserRole, displayName?: string) {
    const exists = await this.model.findOne({ username });
    if (exists) throw new ConflictException(`用户 ${username} 已存在`);
    const u = await this.model.create({
      username,
      passwordHash: hashPassword(password),
      role,
      displayName,
    });
    return { username: u.username, role: u.role, displayName: u.displayName };
  }
}
