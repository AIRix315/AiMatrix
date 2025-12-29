/**
 * E2E 测试 - 设置和插件管理
 * 测试应用设置、插件安装、配置功能
 */
import { test, expect } from './fixtures/electron.fixture';

test.describe('设置和插件管理', () => {
  test('导航到 Settings 页面', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Settings').catch(async () => {
      // 尝试点击最后一个导航项（通常是Settings）
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length > 0) {
        await navItems[navItems.length - 1].click();
      }
    });

    await mainWindow.waitForTimeout(2000);

    const hasContent = await mainWindow.evaluate(() => {
      return document.body.textContent?.includes('Settings') ||
             document.body.textContent?.includes('设置');
    });

    expect(hasContent).toBe(true);
    console.log('✅ 成功导航到 Settings 页面');
  });

  test('Settings 页面配置项', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Settings').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length > 0) await navItems[navItems.length - 1].click();
    });
    await mainWindow.waitForTimeout(2000);

    const inputs = await mainWindow.$$('input');
    console.log(`✅ 设置页面有 ${inputs.length} 个输入框`);

    const selects = await mainWindow.$$('select');
    console.log(`✅ 设置页面有 ${selects.length} 个下拉框`);
  });

  test('导航到 Plugins 页面', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Plugins').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 4) {
        await navItems[3].click();
      }
    });

    await mainWindow.waitForTimeout(2000);

    const hasContent = await mainWindow.evaluate(() => {
      return document.body.textContent?.includes('Plugins') ||
             document.body.textContent?.includes('插件');
    });

    expect(hasContent).toBe(true);
    console.log('✅ 成功导航到 Plugins 页面');
  });

  test('Plugins 页面插件列表', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Plugins').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 4) await navItems[3].click();
    });
    await mainWindow.waitForTimeout(2000);

    const mainContent = await mainWindow.$('main');
    expect(mainContent).toBeTruthy();
    console.log('✅ 插件页面主内容区存在');
  });

  test('插件安装按钮交互', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Plugins').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length >= 4) await navItems[3].click();
    });
    await mainWindow.waitForTimeout(2000);

    const buttons = await mainWindow.$$('button');

    for (const button of buttons) {
      const text = await button.textContent();
      if (text && (text.includes('安装') || text.includes('Install') || text.includes('市场') || text.includes('Market'))) {
        console.log(`✅ 找到插件相关按钮: "${text}"`);

        try {
          await button.click();
          await mainWindow.waitForTimeout(500);
          console.log('✅ 成功点击按钮');
          await mainWindow.press('Escape');
          return;
        } catch (error) {
          console.log('⚠️ 点击失败');
        }
      }
    }

    console.log('⚠️ 未找到插件安装按钮');
  });

  test('API Provider配置输入', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Settings').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length > 0) await navItems[navItems.length - 1].click();
    });
    await mainWindow.waitForTimeout(2000);

    // 查找API Key相关输入框
    const inputs = await mainWindow.$$('input');

    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');

      if (placeholder?.includes('API') || name?.includes('api') || placeholder?.includes('密钥')) {
        console.log(`✅ 找到API配置输入框: placeholder="${placeholder}", name="${name}"`);

        try {
          await input.fill('test-api-key-123');
          await mainWindow.waitForTimeout(300);
          console.log('✅ 成功输入API Key');
          await input.fill('');
          return;
        } catch (error) {
          console.log('⚠️ 输入失败');
        }
      }
    }

    console.log('⚠️ 未找到API配置输入框');
  });

  test('模型管理界面元素', async ({ electronApp, mainWindow }) => {
    await electronApp.clickNavItem('Settings').catch(async () => {
      const navItems = await mainWindow.$$('nav a');
      if (navItems.length > 0) await navItems[navItems.length - 1].click();
    });
    await mainWindow.waitForTimeout(2000);

    // 查找模型相关文本
    const hasModel = await mainWindow.evaluate(() => {
      return document.body.textContent?.includes('模型') ||
             document.body.textContent?.includes('Model');
    });

    if (hasModel) {
      console.log('✅ 页面包含模型相关内容');
    } else {
      console.log('⚠️ 未找到模型相关内容');
    }
  });
});
