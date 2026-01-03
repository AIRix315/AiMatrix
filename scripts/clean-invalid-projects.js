/**
 * 清理无效的项目目录脚本
 *
 * 用途：删除测试过程中遗留的空项目或损坏的项目目录
 *
 * 使用方法：
 *   node scripts/clean-invalid-projects.js [--dry-run]
 *
 * 参数：
 *   --dry-run: 仅显示将要删除的项目，不实际删除
 */

const fs = require('fs').promises;
const path = require('path');

// 项目根目录
const projectRoot = path.join(__dirname, '..');
const projectsDir = path.join(projectRoot, 'projects');

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

/**
 * 检查项目是否有效
 */
async function isValidProject(projectPath) {
  try {
    const configPath = path.join(projectPath, 'project.json');

    // 检查文件是否存在
    try {
      await fs.access(configPath);
    } catch {
      return { valid: false, reason: '缺少 project.json 文件' };
    }

    // 读取文件内容
    const content = await fs.readFile(configPath, 'utf-8');

    // 检查是否为空
    if (!content || content.trim().length === 0) {
      return { valid: false, reason: 'project.json 文件为空' };
    }

    // 尝试解析 JSON
    try {
      const config = JSON.parse(content);

      // 检查必要字段
      if (!config.id || !config.name) {
        return { valid: false, reason: '缺少必要字段 (id 或 name)' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `JSON 格式错误: ${error.message}` };
    }
  } catch (error) {
    return { valid: false, reason: `读取失败: ${error.message}` };
  }
}

/**
 * 删除目录
 */
async function removeDirectory(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`  ❌ 删除失败: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始扫描项目目录...\n');

  if (dryRun) {
    console.log('⚠️  模拟运行模式 (--dry-run)，不会实际删除文件\n');
  }

  try {
    // 检查项目目录是否存在
    try {
      await fs.access(projectsDir);
    } catch {
      console.log('❌ 项目目录不存在:', projectsDir);
      return;
    }

    // 读取所有项目目录
    const entries = await fs.readdir(projectsDir, { withFileTypes: true });
    const projectDirs = entries.filter(entry => entry.isDirectory());

    if (projectDirs.length === 0) {
      console.log('✅ 没有找到任何项目目录');
      return;
    }

    console.log(`📂 找到 ${projectDirs.length} 个项目目录\n`);

    let validCount = 0;
    let invalidCount = 0;
    let deletedCount = 0;

    // 检查每个项目
    for (const dir of projectDirs) {
      const projectPath = path.join(projectsDir, dir.name);
      const result = await isValidProject(projectPath);

      if (result.valid) {
        console.log(`✅ 有效项目: ${dir.name}`);
        validCount++;
      } else {
        console.log(`❌ 无效项目: ${dir.name}`);
        console.log(`   原因: ${result.reason}`);
        invalidCount++;

        if (dryRun) {
          console.log(`   将删除: ${projectPath}\n`);
        } else {
          console.log(`   正在删除...`);
          const deleted = await removeDirectory(projectPath);
          if (deleted) {
            console.log(`   ✅ 已删除\n`);
            deletedCount++;
          } else {
            console.log();
          }
        }
      }
    }

    // 输出统计信息
    console.log('\n' + '='.repeat(50));
    console.log('📊 统计信息:');
    console.log(`   总计: ${projectDirs.length} 个项目目录`);
    console.log(`   有效: ${validCount} 个`);
    console.log(`   无效: ${invalidCount} 个`);

    if (dryRun) {
      console.log(`   将删除: ${invalidCount} 个`);
      console.log('\n💡 提示: 移除 --dry-run 参数以实际删除这些项目');
    } else {
      console.log(`   已删除: ${deletedCount} 个`);
      if (deletedCount < invalidCount) {
        console.log(`   删除失败: ${invalidCount - deletedCount} 个`);
      }
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 执行
main().catch(error => {
  console.error('未处理的错误:', error);
  process.exit(1);
});
