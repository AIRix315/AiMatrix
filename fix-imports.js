const fs = require('fs');
const path = require('path');

// 需要修复的文件和要删除的导入
const fixes = [
  // App.tsx - 删除 setQueueCount
  {
    file: 'src/renderer/App.tsx',
    pattern: /const \[queueCount, setQueueCount\] = useState\(3\);/,
    replacement: 'const [queueCount] = React.useState(3);'
  },
  // UIDemo.tsx - 删除 FieldType
  {
    file: 'src/renderer/pages/demo/UIDemo.tsx',
    pattern: /import \{[^}]*FieldType,?\s*/g,
    replacement: (match) => match.replace(/FieldType,?\s*/, '')
  },
  // Assets.tsx - 删除 useEffect 和 Modal
  {
    file: 'src/renderer/pages/assets/Assets.tsx',
    pattern: /import React, \{ useState, useEffect \} from 'react';/,
    replacement: "import React, { useState } from 'react';"
  },
  // ChapterSplitPanel - 删除 Plus, Minus, Card
  {
    file: 'src/renderer/pages/workflows/panels/ChapterSplitPanel.tsx',
    pattern: /import \{ Plus, Minus, Upload, ChevronDown, ChevronUp, Check \} from 'lucide-react';/,
    replacement: "import { Upload, ChevronDown, ChevronUp, Check } from 'lucide-react';"
  },
  // SceneCharacterPanel - 删除 Check, X, Card
  {
    file: 'src/renderer/pages/workflows/panels/SceneCharacterPanel.tsx',
    pattern: /import \{[^}]*Check,?\s*X,?\s*/g,
    replacement: (match) => match.replace(/Check,?\s*/, '').replace(/X,?\s*/, '')
  },
  // plugin-view.ts - 删除 ReactNode
  {
    file: 'src/shared/types/plugin-view.ts',
    pattern: /import \{ ReactElement, ReactNode, ComponentType \} from 'react';/,
    replacement: "import { ReactElement, ComponentType } from 'react';"
  }
];

fixes.forEach(fix => {
  try {
    const filePath = path.join(__dirname, fix.file);
    if (!fs.existsSync(filePath)) {
      console.log(`跳过: ${fix.file} (文件不存在)`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const newContent = typeof fix.replacement === 'function'
      ? content.replace(fix.pattern, fix.replacement)
      : content.replace(fix.pattern, fix.replacement);

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ 修复: ${fix.file}`);
    } else {
      console.log(`- 跳过: ${fix.file} (无需修改)`);
    }
  } catch (err) {
    console.error(`✗ 错误: ${fix.file}`, err.message);
  }
});

console.log('\n批量修复完成！');
