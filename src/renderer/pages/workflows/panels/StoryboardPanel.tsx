/**
 * StoryboardPanel - 分镜脚本生成面板
 *
 * 功能：为场景生成分镜脚本和图片/视频
 */

import React, { useState } from 'react';
import { Button, Card, Loading, Toast } from '../../../components/common';
import type { ToastType } from '../../../components/common/Toast';
import './StoryboardPanel.css';

interface Storyboard {
  id: string;
  sceneId: string;
  type: 'image' | 'video';
  description: string;
  prompt?: string;
  imagePath?: string;
  videoPath?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface PanelProps {
  workflowId: string;
  onComplete: (data: any) => void;
  initialData?: any;
}

export const StoryboardPanel: React.FC<PanelProps> = ({ workflowId, onComplete, initialData }) => {
  const [scenes] = useState(initialData?.scenes || []);
  const [storyboards, setStoryboards] = useState<Storyboard[]>(initialData?.storyboards || []);
  const [loading, setLoading] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video'>('image');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  /**
   * 处理生成分镜
   */
  const handleGenerate = async () => {
    if (scenes.length === 0) {
      setToast({
        type: 'warning',
        message: '没有可用的场景'
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: 调用IPC API生成分镜
      // const result = await window.electronAPI.novelVideo.generateStoryboards(workflowId, scenes.map(s => s.id), generationType);

      // 临时模拟数据
      const mockStoryboards: Storyboard[] = scenes.slice(0, 3).map((scene: any, i: number) => ({
        id: `storyboard-${scene.id}-${i + 1}`,
        sceneId: scene.id,
        type: generationType,
        description: `${scene.name}的分镜脚本`,
        prompt: `${scene.description}，${generationType === 'image' ? '图片' : '视频'}风格`,
        imagePath: generationType === 'image' ? `/mock/image-${i + 1}.png` : undefined,
        videoPath: generationType === 'video' ? `/mock/video-${i + 1}.mp4` : undefined,
        status: 'completed'
      }));

      setStoryboards([...storyboards, ...mockStoryboards]);
      setToast({
        type: 'success',
        message: `生成成功！共${mockStoryboards.length}个分镜`
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('生成分镜失败:', error);
      setToast({
        type: 'error',
        message: `生成失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理下一步
   */
  const handleNext = () => {
    if (storyboards.length === 0) {
      setToast({
        type: 'warning',
        message: '请先生成分镜脚本'
      });
      return;
    }

    onComplete({
      storyboards
    });
  };

  return (
    <div className="storyboard-panel">
      <div className="panel-header">
        <h2>分镜脚本生成</h2>
        <p className="panel-description">为场景生成分镜脚本和图片/视频资源</p>
      </div>

      <div className="panel-content">
        {/* 生成类型选择器 */}
        <div className="generation-options">
          <div className="option-group">
            <label>生成类型:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="image"
                  checked={generationType === 'image'}
                  onChange={(e) => setGenerationType(e.target.value as 'image' | 'video')}
                  disabled={loading}
                />
                <span>图片分镜</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="video"
                  checked={generationType === 'video'}
                  onChange={(e) => setGenerationType(e.target.value as 'image' | 'video')}
                  disabled={loading}
                />
                <span>视频分镜</span>
              </label>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || scenes.length === 0}>
            {loading ? '生成中...' : '🎬 生成分镜'}
          </Button>
        </div>

        {/* 场景统计 */}
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-label">可用场景:</span>
            <span className="stat-value">{scenes.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已生成分镜:</span>
            <span className="stat-value">{storyboards.length}</span>
          </div>
        </div>

        {/* 加载指示器 */}
        {loading && <Loading size="md" message="正在生成分镜脚本，请稍候..." />}

        {/* 分镜列表 */}
        {storyboards.length > 0 && (
          <div className="storyboard-list-section">
            <h3>分镜列表</h3>
            <div className="storyboard-list">
              {storyboards.map((storyboard) => (
                <Card
                  key={storyboard.id}
                  tag={storyboard.type === 'image' ? '图片' : '视频'}
                  title={storyboard.description}
                  info={`状态: ${storyboard.status === 'completed' ? '已完成' : '生成中'}`}
                  image={storyboard.type === 'image' ? '🖼️' : '🎬'}
                  hoverable
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="panel-footer">
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={storyboards.length === 0}
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
