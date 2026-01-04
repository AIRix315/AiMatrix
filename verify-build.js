/**
 * 验证build文件是否包含所有修复
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('验证 Build 文件是否包含所有修复');
console.log('========================================\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// 检查主进程 (build/main/index.js)
console.log('[1] 检查主进程 (build/main/index.js)...');
try {
  const mainPath = path.join(__dirname, 'build/main/index.js');
  if (!fs.existsSync(mainPath)) {
    console.log('   ❌ 文件不存在！需要运行 npm run build');
    checks.failed++;
  } else {
    const mainContent = fs.readFileSync(mainPath, 'utf8');

    // 检查 isBearerAuth 修复
    const bearerCount = (mainContent.match(/isBearerAuth/g) || []).length;
    if (bearerCount >= 5) {
      console.log(`   ✅ isBearerAuth 修复存在 (${bearerCount} 次出现)`);
      checks.passed++;
    } else {
      console.log(`   ❌ isBearerAuth 修复缺失或不完整 (仅 ${bearerCount} 次出现)`);
      checks.failed++;
    }

    // 检查调试日志
    if (mainContent.includes('Testing Provider: id=')) {
      console.log('   ✅ 调试日志代码存在');
      checks.passed++;
    } else {
      console.log('   ⚠️  调试日志代码缺失（可选功能）');
      checks.warnings++;
    }

    // 检查文件大小（应该是2-3MB）
    const stats = fs.statSync(mainPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ℹ️  文件大小: ${sizeMB} MB`);

    // 检查修改时间
    const mtime = new Date(stats.mtime);
    console.log(`   ℹ️  最后修改: ${mtime.toLocaleString('zh-CN')}`);
  }
} catch (error) {
  console.log(`   ❌ 检查失败: ${error.message}`);
  checks.failed++;
}

console.log('');

// 检查渲染进程 (build/renderer/bundle.js)
console.log('[2] 检查渲染进程 (build/renderer/bundle.js)...');
try {
  const rendererPath = path.join(__dirname, 'build/renderer/bundle.js');
  if (!fs.existsSync(rendererPath)) {
    console.log('   ❌ 文件不存在！需要运行 npm run build');
    checks.failed++;
  } else {
    const rendererContent = fs.readFileSync(rendererPath, 'utf8');

    // 检查删除按钮
    const deleteButtonCount = (rendererContent.match(/delete-button/g) || []).length;
    if (deleteButtonCount >= 10) {
      console.log(`   ✅ 删除按钮样式存在 (${deleteButtonCount} 次出现)`);
      checks.passed++;
    } else {
      console.log(`   ❌ 删除按钮样式缺失 (仅 ${deleteButtonCount} 次出现)`);
      checks.failed++;
    }

    // 检查删除按钮文本
    if (rendererContent.includes('删除 Provider')) {
      console.log('   ✅ 删除按钮文本存在');
      checks.passed++;
    } else {
      console.log('   ❌ 删除按钮文本缺失');
      checks.failed++;
    }

    // 检查 handleTestConnection 函数
    if (rendererContent.includes('handleTestConnection')) {
      console.log('   ✅ handleTestConnection 函数存在');
      checks.passed++;
    } else {
      console.log('   ❌ handleTestConnection 函数缺失');
      checks.failed++;
    }

    // 检查文件大小（应该是15-20MB）
    const stats = fs.statSync(rendererPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ℹ️  文件大小: ${sizeMB} MB`);

    // 检查修改时间
    const mtime = new Date(stats.mtime);
    console.log(`   ℹ️  最后修改: ${mtime.toLocaleString('zh-CN')}`);
  }
} catch (error) {
  console.log(`   ❌ 检查失败: ${error.message}`);
  checks.failed++;
}

console.log('');

// 检查模板文件 (provider-templates/templates.json)
console.log('[3] 检查Provider模板 (provider-templates/templates.json)...');
try {
  const templatesPath = path.join(__dirname, 'provider-templates/templates.json');
  if (!fs.existsSync(templatesPath)) {
    console.log('   ❌ 文件不存在！');
    checks.failed++;
  } else {
    const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
    const templates = templatesData.templates || [];

    let allCategoriesValid = true;
    let deepseekFound = false;

    for (const template of templates) {
      // 检查 category 是否是字符串（不是数组）
      if (Array.isArray(template.category)) {
        console.log(`   ❌ ${template.id}: category 仍然是数组: ${JSON.stringify(template.category)}`);
        allCategoriesValid = false;
        checks.failed++;
      }

      // 检查 DeepSeek 模板
      if (template.id === 'deepseek') {
        deepseekFound = true;
        if (template.category === 'llm' && template.authType === 'bearer') {
          console.log('   ✅ DeepSeek 模板配置正确');
          checks.passed++;
        } else {
          console.log(`   ❌ DeepSeek 模板配置错误: category=${template.category}, authType=${template.authType}`);
          checks.failed++;
        }
      }
    }

    if (allCategoriesValid) {
      console.log(`   ✅ 所有模板的 category 都是字符串格式`);
      checks.passed++;
    }

    if (!deepseekFound) {
      console.log('   ⚠️  未找到 DeepSeek 模板');
      checks.warnings++;
    }
  }
} catch (error) {
  console.log(`   ❌ 检查失败: ${error.message}`);
  checks.failed++;
}

// 总结
console.log('');
console.log('========================================');
console.log('检查结果汇总');
console.log('========================================');
console.log(`✅ 通过: ${checks.passed}`);
console.log(`❌ 失败: ${checks.failed}`);
console.log(`⚠️  警告: ${checks.warnings}`);
console.log('');

if (checks.failed === 0) {
  console.log('🎉 所有关键修复都已存在于build文件中！');
  console.log('');
  console.log('如果应用仍显示旧代码，请：');
  console.log('1. 运行 URGENT_FIX.bat 彻底清理并重建');
  console.log('2. 确保关闭了所有Electron窗口');
  console.log('3. 在应用中按 Ctrl+Shift+R 强制刷新');
} else {
  console.log('❌ 发现问题！请运行 npm run build 重新构建项目。');
}

console.log('');
process.exit(checks.failed > 0 ? 1 : 0);
