/**
 * AddProviderDialog 组件 - 极简版
 *
 * 功能：
 * - 仅2个字段：Provider名称 + API调用模板（可选）
 * - 模板自动应用baseUrl、authType、endpoints等默认配置
 * - 分类和Logo在创建后通过ProviderConfigCard编辑
 */

import React, { useState } from 'react';
import {
  Image, Sparkles, Video, Volume2, Bot, MessageSquare, Settings as SettingsIcon, X
} from 'lucide-react';
import { Modal, Button, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import './AddProviderDialog.css';

// 从shared types导入APICategory和AuthType
type APICategory = 'image-generation' | 'video-generation' | 'audio-generation' | 'llm' | 'workflow' | 'tts' | 'stt' | 'embedding' | 'translation';
type AuthType = 'bearer' | 'apikey' | 'basic' | 'none';

// Template类型ID（8个预定义模板）
type TemplateTypeId =
  | 'deepseek'       // DeepSeek模板
  | 'ollama'         // Ollama模板
  | 'comfyui'        // ComfyUI模板
  | 't8star'         // T8Star模板
  | 'running-hub'    // Running Hub模板
  | 'openai'         // OpenAI模板
  | 'gemini'         // Gemini模板
  | 'none';          // 不使用模板（完全自定义）

// Template选项定义
const TEMPLATE_OPTIONS = [
  { id: 'none' as const, name: '不使用模板（完全自定义）', icon: SettingsIcon },
  { id: 'deepseek' as const, name: 'DeepSeek', icon: Bot },
  { id: 'ollama' as const, name: 'Ollama', icon: Bot },
  { id: 'comfyui' as const, name: 'ComfyUI', icon: Image },
  { id: 't8star' as const, name: 'T8Star', icon: Video },
  { id: 'running-hub' as const, name: 'Running Hub', icon: Volume2 },
  { id: 'openai' as const, name: 'OpenAI', icon: MessageSquare },
  { id: 'gemini' as const, name: 'Gemini', icon: Sparkles }
];

// 组件Props
interface AddProviderDialogProps {
  isOpen: boolean;
  onSave: (config: unknown) => Promise<void>;
  onClose: () => void;
}

export const AddProviderDialog: React.FC<AddProviderDialogProps> = ({
  isOpen,
  onSave,
  onClose
}) => {
  // 表单状态（仅2个字段）
  const [providerName, setProviderName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateTypeId>('none');

  // UI状态
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 表单验证（仅验证名称）
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!providerName.trim()) {
      errors.push('请输入 Provider 名称');
    }

    return errors;
  };

  // 保存逻辑
  const handleCreate = async () => {
    // 1. 验证表单
    const errors = validateForm();
    if (errors.length > 0) {
      setToast({
        type: 'error',
        message: errors.join('\n')
      });
      return;
    }

    // 2. 从后端获取Template默认配置（如果选择了Template）
    let template: unknown = null;
    if (selectedTemplate !== 'none') {
      try {
        template = await window.electronAPI.getProviderTemplate(selectedTemplate);
      } catch (error) {
        setToast({
          type: 'warning',
          message: `无法加载Template，将使用默认配置: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // 3. 构建Provider配置对象（最小化）
    const templateObj = template as {
      category?: string;
      baseUrl?: string;
      authType?: string;
      endpoints?: Record<string, string>;
      features?: unknown;
      documentationUrl?: string;
      costPerUnit?: number;
      currency?: string;
    };

    const config = {
      id: `${providerName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: providerName.trim(),
      type: selectedTemplate !== 'none' ? selectedTemplate : 'custom',
      enabled: false,  // 初始禁用，配置完成后再启用

      // 应用Template默认值（如果有）
      ...(template && typeof template === 'object' ? {
        category: (templateObj.category as APICategory) || ('llm' as APICategory),
        baseUrl: templateObj.baseUrl || '',
        authType: (templateObj.authType as AuthType) || ('bearer' as AuthType),
        endpoints: templateObj.endpoints || {},
        features: templateObj.features,
        documentationUrl: templateObj.documentationUrl,
        costPerUnit: templateObj.costPerUnit,
        currency: templateObj.currency
      } : {
        category: 'llm' as APICategory,
        baseUrl: '',
        authType: 'bearer' as AuthType
      })
    };

    // 4. 保存Provider
    try {
      setSaving(true);
      await onSave(config);
      setToast({
        type: 'success',
        message: `Provider "${providerName}" 创建成功！请继续配置 API Key 等信息`
      });

      // 延迟关闭对话框，让用户看到成功提示
      setTimeout(() => {
        onClose();
        // 重置表单
        setProviderName('');
        setSelectedTemplate('none');
      }, 1500);
    } catch (error) {
      setToast({
        type: 'error',
        message: `创建失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setSaving(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (!saving) {
      onClose();
      // 重置表单
      setProviderName('');
      setSelectedTemplate('none');
      setToast(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        width="360px"
        showCloseButton={false}
      >
        <div className="add-provider-dialog">
          {/* 对话框头部 */}
          <div className="dialog-header">
            <h2 className="dialog-title">添加 Provider</h2>
            <button
              className="close-button"
              onClick={handleClose}
              disabled={saving}
              aria-label="关闭对话框"
            >
              <X size={18} />
            </button>
          </div>

          {/* 表单内容（仅2个字段）*/}
          <div className="dialog-body">
            {/* Provider名称 */}
            <div className="form-field">
              <label className="field-label">Provider 名称 *</label>
              <input
                type="text"
                className="input-field"
                placeholder="如: 我的ComfyUI、公司API服务"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                disabled={saving}
              />
            </div>

            {/* API调用模板（可选）*/}
            <div className="form-field">
              <label className="field-label">API调用模板（可选）</label>
              <div className="select-wrapper">
                <select
                  className="select-field"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as TemplateTypeId)}
                  disabled={saving}
                >
                  {TEMPLATE_OPTIONS.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <div className="select-icon">
                  {React.createElement(
                    TEMPLATE_OPTIONS.find(t => t.id === selectedTemplate)?.icon || SettingsIcon,
                    { size: 18 }
                  )}
                </div>
              </div>
              <div className="field-hint">
                选择模板后会自动应用API调用方式，创建后可在配置卡片中修改详细参数
              </div>
            </div>

            {/* 提示信息 */}
            <div className="info-message">
              <span className="info-icon">ℹ️</span>
              <span>创建后可在配置卡片中设置分类、Logo、API Key、Base URL等详细信息</span>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="dialog-footer">
            <Button onClick={handleClose} disabled={saving}>
              取消
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? '创建中...' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};
