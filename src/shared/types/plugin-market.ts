/**
 * 插件市场类型定义
 *
 * 循环全局时间处理要求：
 * 任何涉及时间的文字写入、记录，必须先查询系统时间，
 * 使用函数查询或者MCP服务查询确认后，方可写入
 *
 * 参考：docs/06-core-services-design-v1.0.1.md
 */

import { PluginType, PluginPermission } from '../../common/types';

/**
 * 插件市场条目接口
 * 用于在插件市场中展示插件信息
 */
export interface MarketPluginInfo {
  // 基础信息
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  type: PluginType;
  permissions: PluginPermission[];

  // 市场专属字段
  downloads: number; // 下载量
  rating: number; // 评分 (0-5)
  reviewCount: number; // 评论数
  lastUpdated: Date; // 最后更新时间
  homepage?: string; // 主页链接
  repository?: string; // 仓库链接
  downloadUrl: string; // 下载地址（ZIP），空字符串表示内置插件
  tags: string[]; // 标签（分类）
  screenshots?: string[]; // 截图
  verified: boolean; // 是否官方认证
}

/**
 * 市场查询过滤器接口
 * 用于筛选和排序插件市场列表
 */
export interface MarketFilter {
  type?: PluginType; // 按类型筛选
  tag?: string; // 按标签筛选
  search?: string; // 搜索关键词
  sortBy?: 'downloads' | 'rating' | 'updated'; // 排序方式
  page?: number; // 分页页码
  pageSize?: number; // 每页数量
}

/**
 * 常用标签列表
 * 用于市场筛选栏展示
 */
export const POPULAR_TAGS = [
  'AI',
  '视频生成',
  '图像处理',
  '文本处理',
  '音频处理',
  '官方',
  '社区'
];
