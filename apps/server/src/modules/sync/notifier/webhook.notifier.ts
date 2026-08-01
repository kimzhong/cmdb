import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/** 失败告警：默认走 webhook（飞书/钉钉/Slack 都行），未配置则只打日志 */
@Injectable()
export class WebhookNotifier {
  private readonly logger = new Logger(WebhookNotifier.name);
  private readonly url: string | undefined;

  constructor(config: ConfigService) {
    this.url = config.get<string>('CMDB_ALERT_WEBHOOK') || process.env.CMDB_ALERT_WEBHOOK;
  }

  async notify(payload: { title: string; text: string; meta?: Record<string, unknown> }): Promise<void> {
    if (!this.url) {
      this.logger.warn(`[alert] ${payload.title} | ${payload.text} | ${JSON.stringify(payload.meta)}`);
      return;
    }
    try {
      await axios.post(this.url, { msgtype: 'text', content: { text: `${payload.title}\n${payload.text}` } }, { timeout: 5000 });
    } catch (e) {
      this.logger.error(`webhook 发送失败: ${(e as Error).message}`);
    }
  }
}
