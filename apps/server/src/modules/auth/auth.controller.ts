import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { UserRole } from './schemas/user.schema';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录，返回 JWT' })
  login(@Body() body: { username: string; password: string }) {
    return this.auth.login(body.username, body.password);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: '当前用户信息' })
  me(@Req() req: { user: { username: string; role: string; sub: string } }) {
    return req.user;
  }

  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({ summary: '改自己的密码' })
  async changePassword(
    @Req() req: { user: { username: string } },
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    await this.auth.changePassword(req.user.username, body.oldPassword, body.newPassword);
    return { ok: true };
  }

  @Public() // 这里演示简化版：实际生产可要求 admin 角色
  @Post('register')
  @ApiOperation({ summary: '注册（生产应仅 admin 可调）' })
  register(
    @Body()
    body: { username: string; password: string; role: UserRole; displayName?: string },
  ) {
    return this.auth.createUser(body.username, body.password, body.role, body.displayName);
  }
}
