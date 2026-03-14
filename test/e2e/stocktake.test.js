const { test, expect } = require('@playwright/test');

test.describe('盘库流程E2E测试', () => {
  let adminToken;
  let keeperAToken;

  test.beforeEach(async ({ page, request }) => {
    // 登录管理员获取token
    const adminLogin = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: '123456' }
    });
    const adminData = await adminLogin.json();
    adminToken = adminData.token;

    // 登录仓管员A获取token
    const keeperALogin = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'keeper_a', password: '123456' }
    });
    const keeperAData = await keeperALogin.json();
    keeperAToken = keeperAData.token;
  });

  test('仓管员发起盘库流程', async ({ page }) => {
    // 使用仓管员A登录
    await page.goto('http://localhost:5176/login');
    await page.locator('input[placeholder="请输入用户名"]').fill('keeper_a');
    await page.locator('input[placeholder="请输入密码"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    
    await expect(page).toHaveURL(/.*\/dashboard/);

    // 进入盘库管理页面
    await page.getByRole('link', { name: '盘库管理' }).click();
    await expect(page).toHaveURL(/.*\/stocktake/);

    // 点击发起盘库按钮
    await page.getByRole('button', { name: '发起盘库' }).click();
    
    // 选择仓库
    await page.getByLabel('选择仓库').selectOption({ label: '主仓库' });
    await page.getByPlaceholder('请输入备注').fill('月度例行盘库');
    
    // 提交
    await page.getByRole('button', { name: '确定' }).click();
    
    // 验证盘库创建成功
    await expect(page.getByText('盘库任务创建成功')).toBeVisible();
    await expect(page.getByText('月度例行盘库')).toBeVisible();
  });

  test('仓管员录入盘点数据', async ({ page, request }) => {
    // 先创建一个盘库任务
    const createRes = await request.post('http://localhost:3000/api/stocktake', {
      headers: { Authorization: `Bearer ${keeperAToken}` },
      data: {
        warehouse: '主仓库',
        remark: '测试盘库'
      }
    });
    const createData = await createRes.json();
    const stocktakeId = createData.data._id;

    // 使用仓管员A登录
    await page.goto('http://localhost:5176/login');
    await page.locator('input[placeholder="请输入用户名"]').fill('keeper_a');
    await page.locator('input[placeholder="请输入密码"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();

    // 进入盘库详情页
    await page.goto(`http://localhost:5176/stocktake/${stocktakeId}`);
    
    // 录入盘点数据
    const rows = page.locator('.el-table__row');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const actualInput = row.locator('input[type="number"]').first();
      await actualInput.fill(String(100 + i));
    }
    
    // 保存数据
    await page.getByRole('button', { name: '保存盘点数据' }).click();
    await expect(page.getByText('盘点数据保存成功')).toBeVisible();
  });

  test('管理员复核盘库数据', async ({ page, request }) => {
    // 创建盘库任务并录入数据
    const createRes = await request.post('http://localhost:3000/api/stocktake', {
      headers: { Authorization: `Bearer ${keeperAToken}` },
      data: {
        warehouse: '主仓库',
        remark: '待复核盘库'
      }
    });
    const createData = await createRes.json();
    const stocktakeId = createData.data._id;

    // 录入数据
    await request.put(`http://localhost:3000/api/stocktake/${stocktakeId}/items`, {
      headers: { Authorization: `Bearer ${keeperAToken}` },
      data: {
        items: createData.data.items.map(item => ({
          product: item.product,
          actualQuantity: item.systemQuantity + 1
        }))
      }
    });

    // 使用管理员登录
    await page.goto('http://localhost:5176/login');
    await page.locator('input[placeholder="请输入用户名"]').fill('admin');
    await page.locator('input[placeholder="请输入密码"]').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();

    // 进入盘库详情页
    await page.goto(`http://localhost:5176/stocktake/${stocktakeId}`);
    
    // 点击复核按钮
    await page.getByRole('button', { name: '复核' }).click();
    
    // 输入复核意见
    await page.getByPlaceholder('请输入复核意见').fill('数据核实无误，同意通过');
    await page.getByRole('radio', { name: '通过' }).check();
    
    // 提交复核
    await page.getByRole('button', { name: '确定' }).click();
    
    // 验证复核成功
    await expect(page.getByText('复核成功')).toBeVisible();
    await expect(page.getByText('已通过')).toBeVisible();
  });
});
