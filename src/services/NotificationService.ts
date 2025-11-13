/**
 * Notification service for sending email alerts
 */

import { Resend } from 'resend';
import { RateData } from '../models';
import { AppConfig } from '../config/types';
import { NotificationCache } from '../utils/NotificationCache';

/**
 * EmailContent 接口
 * 定义邮件内容结构
 */
export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * NotificationService 类
 * 负责发送邮件通知并管理通知冷却期
 */
export class NotificationService {
  private resendClient: Resend;
  private config: AppConfig;
  private notificationCache: NotificationCache;

  constructor(
    config: AppConfig,
    notificationCache: NotificationCache
  ) {
    this.config = config;
    this.notificationCache = notificationCache;
    this.resendClient = new Resend(config.notification.resendApiKey);
  }

  /**
   * 发送汇率警报邮件
   * @param rateData 汇率数据
   * @param condition 触发条件 ('above_upper' 或 'below_lower')
   */
  async sendAlert(rateData: RateData, condition: string): Promise<void> {
    // 检查是否在冷却期内
    if (!this.shouldSendNotification(condition)) {
      console.log(`[NotificationService] Notification for condition "${condition}" is in cooldown period, skipping`);
      return;
    }

    // 构建邮件内容
    const emailContent = this.buildEmailContent(rateData, condition);

    // 发送邮件（带重试逻辑）
    await this.sendWithRetry(emailContent);

    // 记录通知发送
    this.notificationCache.record(condition);
    console.log(`[NotificationService] Alert sent successfully for condition: ${condition}`);
  }

  /**
   * 检查是否应该发送通知（考虑冷却期）
   * @param condition 触发条件
   * @returns 如果可以发送返回 true
   */
  private shouldSendNotification(condition: string): boolean {
    return this.notificationCache.canSend(
      condition,
      this.config.notification.cooldownMinutes
    );
  }

  /**
   * 构建邮件内容
   * @param rateData 汇率数据
   * @param condition 触发条件
   * @returns 邮件内容对象
   */
  private buildEmailContent(rateData: RateData, condition: string): EmailContent {
    const { baseCurrency, targetCurrency, conversionRate, timestamp } = rateData;
    const { upper, lower } = this.config.thresholds;

    // 确定触发条件的描述
    let conditionText: string;
    let thresholdValue: number;

    if (condition === 'above_upper') {
      conditionText = '超过上限阈值';
      thresholdValue = upper;
    } else if (condition === 'below_lower') {
      conditionText = '低于下限阈值';
      thresholdValue = lower;
    } else {
      conditionText = '触发阈值';
      thresholdValue = 0;
    }

    // 格式化时间戳 - 使用当前时间而不是API返回的时间戳
    // 因为我们关心的是检测到阈值的时间，而不是API数据的更新时间
    const now = new Date();
    const formattedTime = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    });

    // 构建主题
    const subject = `汇率提醒：${baseCurrency}/${targetCurrency} ${conditionText}`;

    // 构建 HTML 邮件内容
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .alert {
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    .alert h2 {
      margin-top: 0;
      color: #007bff;
    }
    .rate {
      font-size: 32px;
      font-weight: bold;
      color: #007bff;
      margin: 10px 0;
    }
    .info-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      color: #333;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="alert">
    <h2>🔔 汇率提醒</h2>
    
    <div class="info-row">
      <span class="label">货币对：</span>
      <span class="value"><strong>${baseCurrency}/${targetCurrency}</strong></span>
    </div>
    
    <div class="info-row">
      <span class="label">当前汇率：</span>
      <div class="rate">${conversionRate.toFixed(4)}</div>
    </div>
    
    <div class="info-row">
      <span class="label">触发条件：</span>
      <span class="value">${conditionText}（阈值：${thresholdValue.toFixed(4)}）</span>
    </div>
    
    <div class="info-row">
      <span class="label">检测时间：</span>
      <span class="value">${formattedTime}</span>
    </div>
    
    <div class="info-row">
      <span class="label">数据来源：</span>
      <span class="value">${rateData.source}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>此邮件由汇率监控系统自动发送</p>
  </div>
</body>
</html>
    `.trim();

    // 构建纯文本邮件内容
    const textBody = `
汇率提醒
========

货币对：${baseCurrency}/${targetCurrency}
当前汇率：${conversionRate.toFixed(4)}
触发条件：${conditionText}（阈值：${thresholdValue.toFixed(4)}）
检测时间：${formattedTime}
数据来源：${rateData.source}

---
此邮件由汇率监控系统自动发送
    `.trim();

    return {
      subject,
      htmlBody,
      textBody
    };
  }

  /**
   * 发送邮件（带重试逻辑）
   * @param content 邮件内容
   */
  private async sendWithRetry(content: EmailContent): Promise<void> {
    const { fromEmail, toEmail } = this.config.notification;

    try {
      // 第一次尝试发送
      await this.resendClient.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: content.subject,
        html: content.htmlBody,
        text: content.textBody
      });

      console.log(`[NotificationService] Email sent successfully to ${toEmail}`);
    } catch (error) {
      console.error('[NotificationService] First attempt to send email failed:', error);

      // 等待 5 分钟后重试
      console.log('[NotificationService] Waiting 5 minutes before retry...');
      await this.sleep(5 * 60 * 1000); // 5 分钟

      try {
        // 第二次尝试发送
        await this.resendClient.emails.send({
          from: fromEmail,
          to: toEmail,
          subject: content.subject,
          html: content.htmlBody,
          text: content.textBody
        });

        console.log(`[NotificationService] Email sent successfully on retry to ${toEmail}`);
      } catch (retryError) {
        console.error('[NotificationService] Retry attempt to send email failed:', retryError);
        throw new Error(`Failed to send email after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * 睡眠指定毫秒数
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
