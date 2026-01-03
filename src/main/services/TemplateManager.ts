import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './Logger';
import type { ProviderTemplate } from '@/shared/types/provider';

export class TemplateManager {
  private templates: Map<string, ProviderTemplate> = new Map();
  private onlineRepoUrl = 'https://raw.githubusercontent.com/AIRix315/AiMatrix/master/provider-templates/templates.json';
  private localCachePath = path.join(app.getPath('userData'), 'config', 'provider-templates.json');

  async initialize() {
    await this.loadLocalCache();

    this.refreshTemplates().catch(err =>
      logger.warn(`在线Template更新失败，使用本地缓存: ${err.message}`, 'TemplateManager')
    );
  }

  async getTemplate(typeId: string): Promise<ProviderTemplate | null> {
    return this.templates.get(typeId) || null;
  }

  async listTemplatesByCategory(category: string): Promise<ProviderTemplate[]> {
    return Array.from(this.templates.values()).filter(t =>
      t.category.includes(category)
    );
  }

  async refreshTemplates(): Promise<void> {
    try {
      const response = await fetch(this.onlineRepoUrl, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      this.templates.clear();
      data.templates.forEach((t: ProviderTemplate) => {
        this.templates.set(t.id, t);
      });

      await this.saveLocalCache(data);

      await logger.info(`Template库在线更新成功，共 ${this.templates.size} 个模板`, 'TemplateManager');
    } catch (error) {
      await logger.error(`Template库在线更新失败: ${error instanceof Error ? error.message : String(error)}`, 'TemplateManager');
      throw error;
    }
  }

  private async loadLocalCache() {
    try {
      const data = await fs.readJSON(this.localCachePath);
      this.templates.clear();
      data.templates.forEach((t: ProviderTemplate) => {
        this.templates.set(t.id, t);
      });
      await logger.info(`加载本地Template缓存，共 ${this.templates.size} 个模板`, 'TemplateManager');
    } catch (error) {
      this.templates.clear();
      await logger.warn('本地Template缓存不存在，将尝试从在线仓库拉取', 'TemplateManager');
    }
  }

  private async saveLocalCache(data: { version: string; lastUpdated: string; templates: ProviderTemplate[] }) {
    await fs.ensureDir(path.dirname(this.localCachePath));
    await fs.writeJSON(this.localCachePath, {
      version: data.version || '1.0.1',
      lastUpdated: new Date().toISOString(),
      templates: data.templates
    }, { spaces: 2 });
  }
}

export const templateManager = new TemplateManager();
