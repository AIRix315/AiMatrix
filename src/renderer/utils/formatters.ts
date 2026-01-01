/**
 * formatters.ts - 通用格式化工具函数
 * 用于全局UI组件的数据格式化
 */

/**
 * 格式化相对时间
 * @param isoTime - ISO 8601 时间字符串
 * @returns 相对时间描述（如"2天前"）
 */
export const formatRelativeTime = (isoTime: string): string => {
  const now = Date.now();
  const time = new Date(isoTime).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2628000000);
  const years = Math.floor(diff / 31536000000);

  if (years > 0) return `${years}年前`;
  if (months > 0) return `${months}个月前`;
  if (weeks > 0) return `${weeks}周前`;
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
};

/**
 * 格式化文件大小
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小（如"1.2 MB"）
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * 格式化时长（秒转为 HH:MM:SS）
 * @param seconds - 时长（秒）
 * @returns 格式化后的时长（如"01:23:45"）
 */
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return [h, m, s].map((val) => String(val).padStart(2, '0')).join(':');
};

/**
 * 格式化时长（毫秒转为 HH:MM:SS）
 * @param milliseconds - 时长（毫秒）
 * @returns 格式化后的时长（如"01:23:45"）
 */
export const formatDurationMs = (milliseconds: number): string => {
  return formatDuration(Math.floor(milliseconds / 1000));
};

/**
 * 格式化日期为本地字符串
 * @param isoTime - ISO 8601 时间字符串
 * @returns 本地化日期字符串（如"2024-12-31 14:30:00"）
 */
export const formatDateTime = (isoTime: string): string => {
  const date = new Date(isoTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 格式化日期为短格式
 * @param isoTime - ISO 8601 时间字符串
 * @returns 短格式日期（如"2024-12-31"）
 */
export const formatDate = (isoTime: string): string => {
  const date = new Date(isoTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
