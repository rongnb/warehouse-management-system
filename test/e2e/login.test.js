const { test, expect } = require('@playwright/test');

test.describe('登录页面E2E测试', () => {
  test('页面加载正常', async ({ page }) => {
    await page.goto('http://localhost:5176/login');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/仓库管理系统/);
    
    // 验证登录表单元素存在
    await expect(page.locator('input[placeholder="请输入用户名"]')).toBeVisible();
    await expect(page.locator('input[placeholder="请输入密码"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible();
  });

  test('空用户名和密码提示错误', async ({ page }) => {
    await page.goto('http://localhost:5176/login');
    
    await page.getByRole('button', { name: '登录' }).click();
    
    // 验证错误提示
    await expect(page.getByText('用户名不能为空')).toBeVisible();
    await expect(page.getByText('密码不能为空')).toBeVisible();
  });

  test('错误密码提示登录失败', async ({ page }) => {
    await page.goto('http://localhost:5176/login');
    
    await page.locator('input[placeholder="请输入用户名"]').fill('admin');
    await page.locator('input[placeholder="请输入密码"]').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();
    
    // 验证错误提示
    await expect(page.getByText('用户名或密码错误')).toBeVisible();
  });

  test('正确登录跳转到首页', async ({ page }) => {
    await page.goto('http://localhost:5176/login');
    
    await page.locator('input[placeholder="请输入用户名"]').fill('admin');
    await page.locator('input[placeholder="请输入密码"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    
    // 验证跳转到首页
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByText('欢迎使用仓库管理系统')).toBeVisible();
  });

  test('未登录访问受保护页面重定向到登录页', async ({ page }) => {
    await page.goto('http://localhost:5176/stocktake');
    
    // 验证重定向到登录页
    await expect(page).toHaveURL(/.*\/login/);
  });
});
