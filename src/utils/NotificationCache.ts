/**
 * NotificationRecord 接口
 * 记录通知发送的条件和时间戳
 */
export interface NotificationRecord {
  condition: string;
  timestamp: Date;
}

/**
 * NotificationCache 类
 * 管理通知冷却期状态，防止短时间内重复发送通知
 */
export class NotificationCache {
  private cache: Map<string, NotificationRecord>;

  constructor() {
    this.cache = new Map<string, NotificationRecord>();
  }

  /**
   * 检查是否可以发送通知
   * @param condition 触发条件（如 'above_upper' 或 'below_lower'）
   * @param cooldownMinutes 冷却期时长（分钟）
   * @returns 如果可以发送返回 true，否则返回 false
   */
  canSend(condition: string, cooldownMinutes: number): boolean {
    const record = this.cache.get(condition);

    if (!record) {
      return true;
    }

    const now = new Date();
    const timeDiffMs = now.getTime() - record.timestamp.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);

    return timeDiffMinutes >= cooldownMinutes;
  }

  /**
   * 记录通知发送
   * @param condition 触发条件
   */
  record(condition: string): void {
    this.cache.set(condition, {
      condition,
      timestamp: new Date()
    });
  }

  /**
   * 清理过期记录
   * @param cooldownMinutes 冷却期时长（分钟）
   */
  cleanup(cooldownMinutes: number): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    this.cache.forEach((record, key) => {
      const timeDiffMs = now.getTime() - record.timestamp.getTime();
      const timeDiffMinutes = timeDiffMs / (1000 * 60);

      if (timeDiffMinutes >= cooldownMinutes) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 获取缓存大小（用于测试和调试）
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清空所有缓存（用于测试）
   */
  clear(): void {
    this.cache.clear();
  }
}
