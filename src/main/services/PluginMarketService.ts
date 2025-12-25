/**
 * PluginMarketService - 插件市场服务
 *
 * MVP 功能（v0.2.x）：
 * - 硬编码示例插件数据（2-3个示例）
 * - 本地筛选和搜索功能
 * - 仅展示插件信息，不提供下载功能
 *
 * 后续迭代（v0.3.0+）：
 * - 对接远程API (https://api.matrix.studio/plugins)
 * - 在线下载安装功能
 * - 版本更新检测
 */

import { logger } from './Logger';
import { errorHandler, ErrorCode } from './ServiceErrorHandler';
import { PluginType, PluginPermission } from '../../common/types';
import { MarketPluginInfo, MarketFilter } from '../../shared/types/plugin-market';

/**
 * 硬编码示例插件数据
 * MVP 阶段使用，生产环境将从远程API获取
 */
const SAMPLE_MARKET_PLUGINS: MarketPluginInfo[] = [
  {
    id: 'novel-to-video',
    name: '小说转视频',
    version: '1.0.0',
    description:
      '将小说文本转换为视频分镜和素材。官方内置插件，已预装在系统中。支持章节拆解、分镜生成、素材匹配等功能。',
    author: 'MATRIX Team',
    icon: '🎬',
    type: PluginType.OFFICIAL,
    permissions: [
      PluginPermission.FILE_SYSTEM_READ,
      PluginPermission.FILE_SYSTEM_WRITE,
      PluginPermission.NETWORK_OFFICIAL_API
    ],
    downloads: 1520,
    rating: 4.8,
    reviewCount: 45,
    lastUpdated: new Date('2025-12-20'),
    homepage: 'https://matrix.studio/plugins/novel-to-video',
    repository: 'https://github.com/matrix/novel-to-video',
    downloadUrl: '', // 空字符串，表示内置插件无需下载
    tags: ['AI', '视频生成', '文本处理', '官方'],
    screenshots: [],
    verified: true
  },
  {
    id: 'image-enhancer',
    name: 'AI图片增强',
    version: '0.5.0',
    description:
      '使用AI技术提升图片清晰度和质量。支持超分辨率、去噪、色彩增强等功能。社区贡献插件，需手动下载安装。',
    author: 'Community Contributor',
    icon: '🖼️',
    type: PluginType.COMMUNITY,
    permissions: [
      PluginPermission.FILE_SYSTEM_READ,
      PluginPermission.FILE_SYSTEM_WRITE,
      PluginPermission.NETWORK_ANY
    ],
    downloads: 856,
    rating: 4.2,
    reviewCount: 28,
    lastUpdated: new Date('2025-12-15'),
    homepage: '',
    repository: 'https://github.com/someone/image-enhancer',
    downloadUrl: '', // 提示：请从仓库下载ZIP后本地安装
    tags: ['图像处理', 'AI', '社区'],
    screenshots: [],
    verified: false
  },
  {
    id: 'audio-mixer',
    name: '音频混音器',
    version: '1.2.0',
    description:
      '专业音频混音工具，支持多轨道混音、音效处理、音量调节。合作伙伴插件，经过官方认证。',
    author: 'AudioPro Studio',
    icon: '🎵',
    type: PluginType.PARTNER,
    permissions: [
      PluginPermission.FILE_SYSTEM_READ,
      PluginPermission.FILE_SYSTEM_WRITE
    ],
    downloads: 634,
    rating: 4.5,
    reviewCount: 18,
    lastUpdated: new Date('2025-12-18'),
    homepage: 'https://audiopro.studio',
    repository: 'https://github.com/audiopro/mixer-plugin',
    downloadUrl: '', // 请从官网或仓库下载
    tags: ['音频处理', '混音', 'Partner'],
    screenshots: [],
    verified: true
  }
];

/**
 * 插件市场服务类
 * MVP 阶段使用硬编码数据，不对接远程API
 */
export class PluginMarketService {
  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    await logger.info('Initializing PluginMarketService (MVP - hardcoded data)', 'PluginMarketService');
  }

  /**
   * 获取插件市场列表
   * MVP: 返回硬编码的示例插件列表（仅展示，不提供下载）
   * 未来: 从远程API获取 (https://api.matrix.studio/plugins)
   *
   * @param filter 筛选条件
   * @returns 插件列表
   */
  public async fetchMarketPlugins(filter?: MarketFilter): Promise<MarketPluginInfo[]> {
    return errorHandler.wrapAsync(
      async () => {
        await logger.debug('Fetching market plugins', 'PluginMarketService', { filter });

        let plugins = [...SAMPLE_MARKET_PLUGINS];

        // 按类型筛选
        if (filter?.type) {
          plugins = plugins.filter((p) => p.type === filter.type);
        }

        // 按标签筛选
        if (filter?.tag) {
          plugins = plugins.filter((p) => p.tags.includes(filter.tag!));
        }

        // 按搜索关键词筛选
        if (filter?.search) {
          const keyword = filter.search.toLowerCase();
          plugins = plugins.filter(
            (p) =>
              p.name.toLowerCase().includes(keyword) ||
              p.description.toLowerCase().includes(keyword) ||
              p.author.toLowerCase().includes(keyword) ||
              p.tags.some((tag) => tag.toLowerCase().includes(keyword))
          );
        }

        // 排序
        if (filter?.sortBy === 'downloads') {
          plugins.sort((a, b) => b.downloads - a.downloads);
        } else if (filter?.sortBy === 'rating') {
          plugins.sort((a, b) => b.rating - a.rating);
        } else if (filter?.sortBy === 'updated') {
          plugins.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
        }

        // 分页（如果需要）
        if (filter?.page !== undefined && filter?.pageSize !== undefined) {
          const start = filter.page * filter.pageSize;
          const end = start + filter.pageSize;
          plugins = plugins.slice(start, end);
        }

        await logger.debug(`Fetched ${plugins.length} market plugins`, 'PluginMarketService');

        return plugins;
      },
      'PluginMarketService',
      'fetchMarketPlugins',
      ErrorCode.OPERATION_FAILED
    );
  }

  /**
   * 搜索插件（便捷方法）
   *
   * @param keyword 搜索关键词
   * @returns 匹配的插件列表
   */
  public async searchPlugins(keyword: string): Promise<MarketPluginInfo[]> {
    return this.fetchMarketPlugins({ search: keyword });
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    await logger.info('Cleaning up PluginMarketService', 'PluginMarketService');
  }
}

// 导出单例实例
export const pluginMarketService = new PluginMarketService();
