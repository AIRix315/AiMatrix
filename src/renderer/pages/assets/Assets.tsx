/**
 * Assets 页面（占位组件）
 *
 * 此组件将在 Phase 2 中完整重构
 * 当前版本仅作为占位，确保构建通过
 */

import React from 'react';

export function Assets() {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>资产库</h2>
      <p>资产库功能正在开发中...</p>
      <p style={{ fontSize: '14px', marginTop: '10px' }}>
        Phase 2 将实现完整的资产管理功能
      </p>
    </div>
  );
}

export default Assets;
