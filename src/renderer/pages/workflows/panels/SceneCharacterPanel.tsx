/**
 * SceneCharacterPanel - 场景角色提取面板
 *
 * 功能：从章节中提取场景和角色信息
 */

import React, { useState, useEffect } from 'react';
import { Button, Card, Loading, Toast } from '../../../components/common';
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
  chapterId?: string;
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: any) => void;
  initialData?: any;
}

export const SceneCharacterPanel: React.FC<PanelProps> = ({ workflowId, onComplete, initialData }) => {
  const [chapters] = useState(initialData?.chapters || []);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [scenes, setScenes] = useState<Scene[]>(initialData?.scenes || []);
  const [characters, setCharacters] = useState<Character[]>(initialData?.characters || []);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters'>('scenes');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

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
   * 处理下一步
   */
  const handleNext = () => {
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
                场景 ({scenes.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'characters' ? 'active' : ''}`}
                onClick={() => setActiveTab('characters')}
              >
                角色 ({characters.length})
              </button>
            </div>

            {/* 场景列表 */}
            {activeTab === 'scenes' && scenes.length > 0 && (
              <div className="list-section">
                <div className="item-list">
                  {scenes.map((scene) => (
                    <Card
                      key={scene.id}
                      tag={scene.location || '未知地点'}
                      title={scene.name}
                      info={scene.description}
                      hoverable
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 角色列表 */}
            {activeTab === 'characters' && characters.length > 0 && (
              <div className="list-section">
                <div className="item-list">
                  {characters.map((character) => (
                    <Card
                      key={character.id}
                      tag="角色"
                      title={character.name}
                      info={character.description}
                      hoverable
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="panel-footer">
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={scenes.length === 0 && characters.length === 0}
        >
          下一步 →
        </Button>
      </div>

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
