import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Observable, tap } from 'rxjs';
import { AuditLog, AuditLogDocument } from './schemas/audit.schema';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const method = String(req.method).toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next.handle();
    const path = req.originalUrl || req.url;
    const start = Date.now();
    const user = req.user as { sub?: string; username?: string } | undefined;
    return next.handle().pipe(
      tap({
        next: () => this.save({ method, path, status: res.statusCode, req, user, duration: Date.now() - start }),
        error: (err) => this.save({
          method,
          path,
          status: err?.status ?? 500,
          req,
          user,
          duration: Date.now() - start,
          error: err?.message,
        }),
      }),
    );
  }

  private async save(opts: {
    method: string;
    path: string;
    status: number;
    req: unknown;
    user: { sub?: string; username?: string } | undefined;
    duration: number;
    error?: string;
  }) {
    try {
      const body = (opts.req as { body?: unknown }).body;
      let bodyStr: string | undefined;
      if (body && typeof body === 'object') {
        bodyStr = JSON.stringify(body).slice(0, 1000);
      }
      await this.model.create({
        username: opts.user?.username,
        method: opts.method,
        path: opts.path,
        status: opts.status,
        body: bodyStr,
        ip: ((opts.req as { ip?: string }).ip) || undefined,
        durationMs: opts.duration,
      });
    } catch (e) {
      this.logger.warn(`audit save failed: ${(e as Error).message}`);
    }
  }
}
