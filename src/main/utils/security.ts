/**
 * 安全工具模块 - 路径验证和安全检查
 *
 * 用于防止路径遍历攻击和其他安全漏洞
 */

import * as path from 'path';
import { promises as fs } from 'fs';
import { app } from 'electron';

/**
 * 安全配置 - 定义允许访问的基础目录
 */
const ALLOWED_BASE_DIRS = [
  'projects',   // 用户项目目录
  'library',    // 全局资产库
  'temp',       // 临时文件目录
  'logs',       // 日志目录
];

/**
 * 敏感路径模式 - 禁止访问的系统目录
 */
const SENSITIVE_PATH_PATTERNS = [
  /^[A-Z]:\\Windows\\/i,           // Windows 系统目录
  /^[A-Z]:\\Program Files/i,       // Windows 程序目录
  /^\/System\//i,                  // macOS 系统目录
  /^\/usr\/bin\//i,                // Unix 系统二进制
  /^\/etc\//i,                     // Unix 系统配置
  /^\.ssh\//i,                     // SSH 密钥
  /^\.aws\//i,                     // AWS 凭证
  /\.key$/i,                       // 密钥文件
  /\.pem$/i,                       // 证书文件
];

/**
 * 危险字符检测
 */
const DANGEROUS_PATTERNS = [
  /\.\./,          // 父目录引用
  /~\//,           // Home 目录
  /^\/\//,         // UNC 路径
];

/**
 * 路径验证结果接口
 */
export interface PathValidationResult {
  valid: boolean;
  error?: string;
  sanitizedPath?: string;
}

/**
 * 获取应用根目录
 */
function getAppRoot(): string {
  return app.getPath('userData');
}

/**
 * 检查路径是否包含危险字符
 */
function containsDangerousPatterns(requestedPath: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(requestedPath));
}

/**
 * 检查路径是否为敏感系统路径
 */
function isSensitivePath(absolutePath: string): boolean {
  return SENSITIVE_PATH_PATTERNS.some(pattern => pattern.test(absolutePath));
}

/**
 * 验证路径是否在允许的基础目录内
 *
 * @param requestedPath - 请求访问的路径（可以是相对路径或绝对路径）
 * @returns 验证结果
 */
export function validatePath(requestedPath: string): PathValidationResult {
  // 检查输入是否为空
  if (!requestedPath || requestedPath.trim() === '') {
    return {
      valid: false,
      error: '路径不能为空'
    };
  }

  // 检查危险字符
  if (containsDangerousPatterns(requestedPath)) {
    return {
      valid: false,
      error: '路径包含危险字符（如 .. 或 ~/），访问被拒绝'
    };
  }

  try {
    // 解析为绝对路径
    const appRoot = getAppRoot();
    let absolutePath: string;

    if (path.isAbsolute(requestedPath)) {
      absolutePath = path.resolve(requestedPath);
    } else {
      absolutePath = path.resolve(appRoot, requestedPath);
    }

    // 检查是否为敏感系统路径
    if (isSensitivePath(absolutePath)) {
      return {
        valid: false,
        error: '禁止访问系统敏感目录'
      };
    }

    // 检查是否在允许的目录内
    const relativePath = path.relative(appRoot, absolutePath);

    // 如果相对路径以 .. 开头，说明目标路径在应用根目录之外
    if (relativePath.startsWith('..')) {
      return {
        valid: false,
        error: '路径必须在应用数据目录内'
      };
    }

    // 检查是否在允许的基础目录内
    const firstDir = relativePath.split(path.sep)[0];
    if (!ALLOWED_BASE_DIRS.includes(firstDir)) {
      return {
        valid: false,
        error: `只允许访问以下目录: ${ALLOWED_BASE_DIRS.join(', ')}`
      };
    }

    return {
      valid: true,
      sanitizedPath: absolutePath
    };

  } catch (error) {
    return {
      valid: false,
      error: `路径解析失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 获取安全路径 - 验证并返回绝对路径
 *
 * @param requestedPath - 请求的路径
 * @param baseDir - 基础目录（必须是 ALLOWED_BASE_DIRS 中的一个）
 * @returns 安全的绝对路径
 * @throws 如果路径验证失败
 */
export function getSafePath(requestedPath: string, baseDir?: string): string {
  const validation = validatePath(requestedPath);

  if (!validation.valid) {
    throw new Error(`路径验证失败: ${validation.error}`);
  }

  // 如果指定了基础目录，确保路径在该目录下
  if (baseDir && validation.sanitizedPath) {
    if (!ALLOWED_BASE_DIRS.includes(baseDir)) {
      throw new Error(`无效的基础目录: ${baseDir}`);
    }

    const appRoot = getAppRoot();
    const baseDirPath = path.join(appRoot, baseDir);
    const relativePath = path.relative(baseDirPath, validation.sanitizedPath);

    if (relativePath.startsWith('..')) {
      throw new Error(`路径必须在 ${baseDir} 目录内`);
    }
  }

  return validation.sanitizedPath!;
}

/**
 * 确保目录存在且安全
 *
 * @param dirPath - 目录路径
 * @returns 安全的目录路径
 */
export async function ensureSafeDirectory(dirPath: string): Promise<string> {
  const safePath = getSafePath(dirPath);

  try {
    await fs.access(safePath);
  } catch {
    // 目录不存在，创建它
    await fs.mkdir(safePath, { recursive: true });
  }

  return safePath;
}

/**
 * 检查文件是否在安全目录内
 *
 * @param filePath - 文件路径
 * @param allowedDir - 允许的目录（可选）
 * @returns 是否安全
 */
export function isPathSafe(filePath: string, allowedDir?: string): boolean {
  try {
    getSafePath(filePath, allowedDir);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取允许的基础目录列表
 */
export function getAllowedDirectories(): string[] {
  return [...ALLOWED_BASE_DIRS];
}
