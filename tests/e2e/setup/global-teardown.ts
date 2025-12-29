/**
 * Playwright E2E 全局清理
 * 在所有测试结束后运行
 */
export default async function globalTeardown() {
  console.log('🧹 开始 E2E 测试环境清理...');

  // 清理可能残留的测试数据
  // 注意：不要删除用户的真实数据

  console.log('✅ E2E 测试环境清理完成');
}
