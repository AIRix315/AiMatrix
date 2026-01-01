/**
 * RemoteControlPanel - 远端控制面板
 *
 * 功能：通过远端API控制分镜生成
 * 状态：占位实现，待后续扩展
 */

import React from 'react';
import { Cloud, Wifi } from 'lucide-react';
import { Button, Card } from '../../../components/common';
import './RemoteControlPanel.css';

interface RemoteControlPanelProps {
  workflowId: string;
  onComplete: (data: unknown) => void;
  initialData?: unknown;
  stepId?: string;
  subStepId?: string;
  config?: Record<string, unknown>;
}

export const RemoteControlPanel: React.FC<RemoteControlPanelProps> = ({
  workflowId: _workflowId,
  onComplete: _onComplete,
  initialData: _initialData,
  config: _config
}) => {
  return (
    <div className="remote-control-panel">
      <div className="panel-header">
        <div className="header-left">
          <h2>远端控制</h2>
          <p className="panel-description">通过远端API控制分镜生成流程</p>
        </div>
      </div>

      <div className="panel-content">
        {/* 占位内容 */}
        <div className="placeholder-section">
          <Card
            image={<Cloud className="h-16 w-16 text-muted-foreground" />}
            title="远端控制功能"
            info="此功能正在开发中"
            hoverable={false}
          />

          <div className="feature-list">
            <h3>计划功能：</h3>
            <ul>
              <li>
                <Wifi className="h-4 w-4" />
                <span>远程API连接管理</span>
              </li>
              <li>
                <Wifi className="h-4 w-4" />
                <span>实时生成状态监控</span>
              </li>
              <li>
                <Wifi className="h-4 w-4" />
                <span>远程任务队列管理</span>
              </li>
              <li>
                <Wifi className="h-4 w-4" />
                <span>批量提交与进度追踪</span>
              </li>
            </ul>
          </div>

          <Button variant="ghost" disabled>
            敬请期待
          </Button>
        </div>
      </div>
    </div>
  );
};
