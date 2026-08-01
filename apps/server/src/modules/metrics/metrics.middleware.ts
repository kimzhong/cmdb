import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { httpHistogram, requestCounter } from './metrics.controller';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const route = (req.route?.path as string) || req.path || 'unknown';
      const labels = { method: req.method, route, status: String(res.statusCode) };
      const dur = Number(process.hrtime.bigint() - start) / 1e9;
      httpHistogram.observe(labels, dur);
      requestCounter.inc(labels);
    });
    next();
  }
}
