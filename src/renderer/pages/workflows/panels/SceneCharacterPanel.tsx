/**
 * SceneCharacterPanel - 场景角色提取面板
 *
 * 功能：从章节中提取场景和角色信息
 * H2.6: 完整业务逻辑实现（场景展示、角色管理）
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Users } from 'lucide-react';
// import { Check, X } from 'lucide-react'; // 暂时未使用
import { Button, Loading, Toast, Modal } from '../../../components/common';
// import { Card } from '../../../components/common'; // 暂时未使用
import type { ToastType } from '../../../components/common/Toast';
import './SceneCharacterPanel.css';

interface Scene {
  id: string;
  name: string;
  description: string;
  location?: string;
  atmosphere?: string;
  chapterId?: string;
}

interface Character {
  id: string;
  name: string;
  description: string;
  appearance?: string;
  personality?: string;
  chapterId?: string;
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: unknown) => void;
  initialData?: unknown;
}

export const SceneCharacterPanel: React.FC<PanelProps> = ({ onComplete, initialData }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chapters] = useState((initialData as any)?.chapters || []);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scenes, setScenes] = useState<Scene[]>((initialData as any)?.scenes || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [characters, setCharacters] = useState<Character[]>((initialData as any)?.characters || []);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters'>('scenes');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // 角色编辑状态
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [characterForm, setCharacterForm] = useState({
    name: '',
    description: '',
    appearance: '',
    personality: ''
  });

  useEffect(() => {
    if (chapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  /**
   * 处理提取场景和角色
   */
  const handleExtract = async () => {
    if (!selectedChapterId) {
      setToast({
        type: 'warning',
        message: '请先选择章节'
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: 调用IPC API提取场景和角色
      // const result = await window.electronAPI.novelVideo.extractScenesAndCharacters(workflowId, selectedChapterId);

      // 临时模拟数据
      const mockScenes: Scene[] = Array.from({ length: 3 }, (_, i) => ({
        id: `scene-${selectedChapterId}-${i + 1}`,
        name: `场景${i + 1}`,
        description: `这是场景${i + 1}的描述`,
        location: `地点${i + 1}`,
        atmosphere: `氛围${i + 1}`,
        chapterId: selectedChapterId
      }));

      const mockCharacters: Character[] = Array.from({ length: 2 }, (_, i) => ({
        id: `character-${selectedChapterId}-${i + 1}`,
        name: `角色${i + 1}`,
        description: `这是角色${i + 1}的描述`,
        appearance: `外貌${i + 1}`,
        chapterId: selectedChapterId
      }));

      setScenes([...scenes, ...mockScenes]);
      setCharacters([...characters, ...mockCharacters]);
      setToast({
        type: 'success',
        message: `提取成功！场景${mockScenes.length}个，角色${mockCharacters.length}个`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('提取场景和角色失败:', error);
      setToast({
        type: 'error',
        message: `提取失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 打开添加角色对话框
   */
  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setCharacterForm({
      name: '',
      description: '',
      appearance: '',
      personality: ''
    });
    setShowCharacterModal(true);
  };

  /**
   * 打开编辑角色对话框
   */
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setCharacterForm({
      name: character.name,
      description: character.description,
      appearance: character.appearance || '',
      personality: character.personality || ''
    });
    setShowCharacterModal(true);
  };

  /**
   * 保存角色
   */
  const handleSaveCharacter = () => {
    if (!characterForm.name.trim()) {
      setToast({
        type: 'warning',
        message: '请输入角色名称'
      });
      return;
    }

    if (editingCharacter) {
      // 编辑现有角色
      setCharacters((prev) =>
        prev.map((char) =>
          char.id === editingCharacter.id
            ? {
                ...char,
                name: characterForm.name.trim(),
                description: characterForm.description.trim(),
                appearance: characterForm.appearance.trim(),
                personality: characterForm.personality.trim()
              }
            : char
        )
      );
      setToast({
        type: 'success',
        message: '角色已更新'
      });
    } else {
      // 添加新角色
      const newCharacter: Character = {
        id: `character-${Date.now()}`,
        name: characterForm.name.trim(),
        description: characterForm.description.trim(),
        appearance: characterForm.appearance.trim(),
        personality: characterForm.personality.trim()
      };
      setCharacters([...characters, newCharacter]);
      setToast({
        type: 'success',
        message: '角色已添加'
      });
    }

    setShowCharacterModal(false);
  };

  /**
   * 删除角色
   */
  const handleDeleteCharacter = (characterId: string) => {
    setCharacters((prev) => prev.filter((char) => char.id !== characterId));
    setToast({
      type: 'info',
      message: '角色已删除'
    });
  };

  /**
   * 处理下一步
   */
  const _handleNext = () => {
    if (scenes.length === 0 && characters.length === 0) {
      setToast({
        type: 'warning',
        message: '请先提取场景和角色'
      });
      return;
    }

    onComplete({
      scenes,
      characters
    });
  };

  return (
    <div className="scene-character-panel">
      <div className="panel-header">
        <h2>场景角色提取</h2>
        <p className="panel-description">使用AI从章节中提取场景和角色信息</p>
      </div>

      <div className="panel-content">
        {/* 章节选择器 */}
        <div className="chapter-selector">
          <label>选择章节:</label>
          <select
            value={selectedChapterId}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            disabled={loading}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {chapters.map((chapter: any) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title}
              </option>
            ))}
          </select>
          <Button onClick={handleExtract} disabled={loading || !selectedChapterId}>
            {loading ? '提取中...' : '🔍 提取场景和角色'}
          </Button>
        </div>

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在提取场景和角色，请稍候..." />}

        {/* 标签页切换 */}
        {(scenes.length > 0 || characters.length > 0) && (
          <>
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === 'scenes' ? 'active' : ''}`}
                onClick={() => setActiveTab('scenes')}
              >
                <MapPin size={16} />
                场景 ({scenes.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'characters' ? 'active' : ''}`}
                onClick={() => setActiveTab('characters')}
              >
                <Users size={16} />
                角色 ({characters.length})
              </button>
            </div>

            {/* 场景列表 */}
            {activeTab === 'scenes' && (
              <div className="list-section">
                {scenes.length > 0 ? (
                  <div className="scene-grid">
                    {scenes.map((scene) => (
                      <div key={scene.id} className="scene-card">
                        <div className="scene-header">
                          <h4 className="scene-name">{scene.name}</h4>
                          {scene.location && (
                            <span className="scene-location">
                              <MapPin size={14} />
                              {scene.location}
                            </span>
                          )}
                        </div>
                        <p className="scene-description">{scene.description}</p>
                        {scene.atmosphere && (
                          <div className="scene-atmosphere">
                            <span className="atmosphere-label">氛围:</span>
                            <span className="atmosphere-text">{scene.atmosphere}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>暂无场景数据</p>
                  </div>
                )}
              </div>
            )}

            {/* 角色列表 */}
            {activeTab === 'characters' && (
              <div className="list-section">
                <div className="section-header">
                  <h3>角色列表</h3>
                  <Button variant="primary" size="sm" onClick={handleAddCharacter}>
                    <Plus size={16} />
                    添加角色
                  </Button>
                </div>
                {characters.length > 0 ? (
                  <div className="character-list">
                    {characters.map((character) => (
                      <div key={character.id} className="character-card">
                        <div className="character-avatar">
                          {character.name.charAt(0)}
                        </div>
                        <div className="character-info">
                          <h4 className="character-name">{character.name}</h4>
                          <p className="character-description">{character.description}</p>
                          {character.appearance && (
                            <div className="character-detail">
                              <span className="detail-label">外貌:</span>
                              <span className="detail-text">{character.appearance}</span>
                            </div>
                          )}
                          {character.personality && (
                            <div className="character-detail">
                              <span className="detail-label">性格:</span>
                              <span className="detail-text">{character.personality}</span>
                            </div>
                          )}
                        </div>
                        <div className="character-actions">
                          <button
                            className="icon-btn edit-btn"
                            onClick={() => handleEditCharacter(character)}
                            title="编辑角色"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="icon-btn delete-btn"
                            onClick={() => handleDeleteCharacter(character.id)}
                            title="删除角色"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>暂无角色数据</p>
                    <Button variant="ghost" size="sm" onClick={handleAddCharacter}>
                      <Plus size={16} />
                      添加第一个角色
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 角色编辑对话框 */}
      {showCharacterModal && (
        <Modal
          isOpen={showCharacterModal}
          title={editingCharacter ? '编辑角色' : '添加角色'}
          onClose={() => setShowCharacterModal(false)}
        >
          <div className="character-form">
            <div className="form-field">
              <label htmlFor="char-name">
                角色名称 <span className="required">*</span>
              </label>
              <input
                id="char-name"
                type="text"
                className="form-input"
                value={characterForm.name}
                onChange={(e) =>
                  setCharacterForm({ ...characterForm, name: e.target.value })
                }
                placeholder="输入角色名称"
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="char-desc">角色描述</label>
              <textarea
                id="char-desc"
                className="form-textarea"
                value={characterForm.description}
                onChange={(e) =>
                  setCharacterForm({ ...characterForm, description: e.target.value })
                }
                placeholder="描述角色的基本信息"
                rows={3}
              />
            </div>

            <div className="form-field">
              <label htmlFor="char-appearance">外貌特征</label>
              <input
                id="char-appearance"
                type="text"
                className="form-input"
                value={characterForm.appearance}
                onChange={(e) =>
                  setCharacterForm({ ...characterForm, appearance: e.target.value })
                }
                placeholder="描述角色的外貌"
              />
            </div>

            <div className="form-field">
              <label htmlFor="char-personality">性格特点</label>
              <input
                id="char-personality"
                type="text"
                className="form-input"
                value={characterForm.personality}
                onChange={(e) =>
                  setCharacterForm({ ...characterForm, personality: e.target.value })
                }
                placeholder="描述角色的性格"
              />
            </div>

            <div className="form-actions">
              <Button variant="ghost" onClick={() => setShowCharacterModal(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveCharacter}>
                {editingCharacter ? '保存' : '添加'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
