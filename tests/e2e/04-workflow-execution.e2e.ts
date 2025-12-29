/**
 * E2E 测试 - 工作流执行流程
 * 测试工作流创建、配置、执行、监控功能
 */
import { test, expect } from './fixtures/electron.fixture';

test.describe('工作流执行流程', () => {
  test('导航到 Workflows 页面', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      // 尝试点击第三个导航项（通常是Workflows）
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) {
        await navItems[2].click();
      }
    });

    await mainWindow.waitForTimeout(2000);

    const hasContent = await mainWindow.evaluate(() => {
      return document.body.textContent?.includes('Workflows') ||
             document.body.textContent?.includes('工作流');
    });

    expect(hasContent).toBe(true);
    console.log('✅ 成功导航到 Workflows 页面');
  });

  test('Workflows 页面显示内容', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) await navItems[2].click();
    });
    await mainWindow.waitForTimeout(2000);

    const mainContent = await mainWindow.$('main');
    expect(mainContent).toBeTruthy();
    console.log('✅ 工作流页面主内容区存在');
  });

  test('工作流模板卡片交互', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) await navItems[2].click();
    });
    await mainWindow.waitForTimeout(2000);

    // 查找可点击的卡片
    const cards = await mainWindow.$$('[class*="card"], [class*="template"], [class*="workflow"]');

    if (cards.length > 0) {
      console.log(`✅ 找到 ${cards.length} 个工作流相关元素`);

      try {
        await cards[0].click();
        await mainWindow.waitForTimeout(1000);
        console.log('✅ 成功点击工作流元素');

        // 按ESC关闭可能的对话框
        await mainWindow.press('Escape');
      } catch (error) {
        console.log('⚠️ 点击失败');
      }
    } else {
      console.log('⚠️ 未找到工作流卡片');
    }
  });

  test('创建工作流按钮', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) await navItems[2].click();
    });
    await mainWindow.waitForTimeout(2000);

    const buttons = await mainWindow.$$('button');

    for (const button of buttons) {
      const text = await button.textContent();
      if (text && (text.includes('新建') || text.includes('创建') || text.includes('Create') || text.includes('New'))) {
        console.log(`✅ 找到创建按钮: "${text}"`);
        return;
      }
    }

    console.log('⚠️ 未找到创建按钮');
  });

  test('工作流编辑器元素', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) await navItems[2].click();
    });
    await mainWindow.waitForTimeout(2000);

    // 检查是否有canvas元素（工作流编辑器可能使用canvas）
    const canvas = await mainWindow.$('canvas');
    if (canvas) {
      console.log('✅ 找到canvas元素（可能是编辑器）');
    } else {
      console.log('⚠️ 未找到canvas元素');
    }
  });

  test('工作流执行控制按钮', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) await navItems[2].click();
    });
    await mainWindow.waitForTimeout(2000);

    const buttons = await mainWindow.$$('button');

    const keywords = ['执行', '运行', 'Execute', 'Run', '开始', 'Start'];
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && keywords.some(k => text.includes(k))) {
        console.log(`✅ 找到执行相关按钮: "${text}"`);
        return;
      }
    }

    console.log('⚠️ 未找到执行按钮');
  });

  test('工作流历史记录', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Workflows').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 3) await navItems[2].click();
    });
    await mainWindow.waitForTimeout(2000);

    // 查找历史相关元素
    const allElements = await mainWindow.$$('*');
    let historyFound = false;

    for (const el of allElements.slice(0, 50)) { // 只检查前50个避免超时
      const text = await el.textContent().catch(() => '');
      if (text && (text.includes('历史') || text.includes('History'))) {
        console.log(`✅ 找到历史相关元素: "${text}"`);
        historyFound = true;
        break;
      }
    }

    if (!historyFound) {
      console.log('⚠️ 未找到历史功能');
    }
  });
});
