import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/common';
import './Assets.css';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'text';
  scope: 'global' | 'project';
  lastModified?: string;
}

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio' | 'text'>('all');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      // 模拟加载资产数据
      const mockAssets: Asset[] = [
        {
          id: '1',
          name: '背景图片1.png',
          type: 'image',
          scope: 'global',
          lastModified: '2 hours ago',
        },
        {
          id: '2',
          name: '视频素材.mp4',
          type: 'video',
          scope: 'project',
          lastModified: '1 day ago',
        },
      ];
      setAssets(mockAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const handleAddAsset = () => {
    // TODO: 实现添加资产模态框
    console.log('Add asset clicked');
  };

  const handleOpenAsset = (assetId: string) => {
    // TODO: 实现打开资产逻辑
    console.log('Open asset:', assetId);
  };

  const filteredAssets = assets.filter(asset => {
    if (filterType === 'all') return true;
    return asset.type === filterType;
  });

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-title">素材 <small>| 资产管理 (Asset Management)</small></div>
        <div className="view-actions">
          <div className="view-switch-container">
            <div
              className={`view-switch-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              全部
            </div>
            <div
              className={`view-switch-btn ${filterType === 'image' ? 'active' : ''}`}
              onClick={() => setFilterType('image')}
            >
              图片
            </div>
            <div
              className={`view-switch-btn ${filterType === 'video' ? 'active' : ''}`}
              onClick={() => setFilterType('video')}
            >
              视频
            </div>
            <div
              className={`view-switch-btn ${filterType === 'audio' ? 'active' : ''}`}
              onClick={() => setFilterType('audio')}
            >
              音频
            </div>
            <div
              className={`view-switch-btn ${filterType === 'text' ? 'active' : ''}`}
              onClick={() => setFilterType('text')}
            >
              文本
            </div>
          </div>
          <Button variant="primary" onClick={handleAddAsset}>
            + 添加素材
          </Button>
        </div>
      </div>

      <div className="dashboard-content">
        {filteredAssets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h2>暂无素材</h2>
            <p>开始添加你的第一个素材吧。</p>
            <Button variant="primary" onClick={handleAddAsset}>
              + 添加素材
            </Button>
          </div>
        ) : (
          <div className="project-grid">
            {filteredAssets.map((asset) => (
              <Card
                key={asset.id}
                tag={asset.scope === 'global' ? 'Global' : 'Project'}
                image={asset.type === 'image' ? '🖼️' : asset.type === 'video' ? '🎬' : asset.type === 'audio' ? '🎵' : '📄'}
                title={asset.name}
                info={`Type: ${asset.type} | Modified: ${asset.lastModified || 'Just now'}`}
                hoverable
                onClick={() => handleOpenAsset(asset.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;