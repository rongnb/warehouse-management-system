<template>
  <div class="dashboard-container">
    <el-row :gutter="24">
      <!-- 统计卡片 -->
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">商品总数</p>
              <h3 class="stat-value">{{ stats.productCount || 0 }}</h3>
              <p class="stat-change text-success">
                <el-icon><TrendCharts /></el-icon>
                <span>+{{ stats.productGrowth || 0 }}% 较上月</span>
              </p>
            </div>
            <div class="stat-icon product-icon">
              <el-icon :size="32"><Goods /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">库存总价值</p>
              <h3 class="stat-value">¥{{ stats.inventoryValue || 0 }}</h3>
              <p class="stat-change text-success">
                <el-icon><TrendCharts /></el-icon>
                <span>+{{ stats.inventoryGrowth || 0 }}% 较上月</span>
              </p>
            </div>
            <div class="stat-icon inventory-icon">
              <el-icon :size="32"><Wallet /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">今日入库</p>
              <h3 class="stat-value">{{ stats.todayIn || 0 }}</h3>
              <p class="stat-change text-success">
                <el-icon><Top /></el-icon>
                <span>{{ stats.inRate || 0 }} 笔</span>
              </p>
            </div>
            <div class="stat-icon in-icon">
              <el-icon :size="32"><Bottom /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">今日出库</p>
              <h3 class="stat-value">{{ stats.todayOut || 0 }}</h3>
              <p class="stat-change text-danger">
                <el-icon><Bottom /></el-icon>
                <span>{{ stats.outRate || 0 }} 笔</span>
              </p>
            </div>
            <div class="stat-icon out-icon">
              <el-icon :size="32"><Top /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="24" style="margin-top: 24px;">
      <!-- 库存预警 -->
      <el-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <el-card title="库存预警" class="chart-card">
          <template #extra>
            <el-button type="primary" text @click="goToInventory">查看全部</el-button>
          </template>
          <el-empty v-if="lowStockProducts.length === 0" description="暂无库存预警" />
          <el-table v-else :data="lowStockProducts" style="width: 100%">
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="quantity" label="库存" width="100" align="center">
              <template #default="{ row }">
                <el-tag type="danger" size="small">{{ row.quantity }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <!-- 出入库趋势 -->
      <el-col :xs="24" :sm="24" :md="16" :lg="16" :xl="16">
        <el-card title="近7天出入库趋势" class="chart-card">
          <div ref="chartRef" class="trend-chart"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="24" style="margin-top: 24px;">
      <!-- 分类占比 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card title="商品分类占比" class="chart-card">
          <div ref="pieChartRef" class="pie-chart"></div>
        </el-card>
      </el-col>
      
      <!-- 最近交易 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card title="最近交易" class="chart-card">
          <template #extra>
            <el-button type="primary" text @click="goToTransactions">查看全部</el-button>
          </template>
          <el-table :data="recentTransactions" style="width: 100%">
            <el-table-column prop="transactionNo" label="单号" />
            <el-table-column prop="productName" label="商品" />
            <el-table-column prop="quantity" label="数量" align="center">
              <template #default="{ row }">
                <el-tag :type="row.type === 'in' ? 'success' : 'danger'">
                  {{ row.type === 'in' ? '+' : '-' }}{{ row.quantity }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="time" label="时间" width="150" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import {
  Goods,
  Wallet,
  Bottom,
  Top,
  TrendCharts
} from '@element-plus/icons-vue';
import { apiClient } from '@/stores';

const router = useRouter();
const chartRef = ref<HTMLElement>();
const pieChartRef = ref<HTMLElement>();

const stats = reactive({
  productCount: 0,
  productGrowth: 0,
  inventoryValue: 0,
  inventoryGrowth: 0,
  todayIn: 0,
  inRate: 0,
  todayOut: 0,
  outRate: 0,
});

const lowStockProducts = ref([]);
const recentTransactions = ref([]);

const loadDashboardData = async () => {
  try {
    // 获取统计数据
    const statsRes = await apiClient.get('/api/dashboard/stats');
    Object.assign(stats, statsRes.data);
    
    // 获取低库存商品
    const lowStockRes = await apiClient.get('/api/dashboard/low-stock');
    lowStockProducts.value = lowStockRes.data.products;
    
    // 获取最近交易
    const transactionsRes = await apiClient.get('/api/dashboard/recent-transactions');
    recentTransactions.value = transactionsRes.data.transactions;
    
    // 初始化图表
    initCharts();
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
    ElMessage.error('加载数据失败');
  }
};

const initCharts = () => {
  // 出入库趋势图
  if (chartRef.value) {
    const chart = echarts.init(chartRef.value);
    chart.setOption({
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['入库', '出库'],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '入库',
          type: 'line',
          stack: 'Total',
          data: [120, 132, 101, 134, 90, 230, 210],
          itemStyle: { color: '#67c23a' },
        },
        {
          name: '出库',
          type: 'line',
          stack: 'Total',
          data: [220, 182, 191, 234, 290, 330, 310],
          itemStyle: { color: '#f56c6c' },
        },
      ],
    });
    
    // 响应式
    window.addEventListener('resize', () => chart.resize());
  }
  
  // 分类占比饼图
  if (pieChartRef.value) {
    const pieChart = echarts.init(pieChartRef.value);
    pieChart.setOption({
      tooltip: {
        trigger: 'item',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '分类占比',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            { value: 1048, name: '电子产品' },
            { value: 735, name: '办公用品' },
            { value: 580, name: '五金工具' },
            { value: 484, name: '生活用品' },
            { value: 300, name: '其他' },
          ],
        },
      ],
    });
    
    window.addEventListener('resize', () => pieChart.resize());
  }
};

const goToInventory = () => {
  router.push('/inventory');
};

const goToTransactions = () => {
  router.push('/transactions');
};

onMounted(() => {
  loadDashboardData();
});
</script>

<style scoped>
.dashboard-container {
  padding: 0;
}

.stat-card {
  margin-bottom: 24px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin: 0 0 8px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.stat-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
}

.stat-change.text-success {
  color: #67c23a;
}

.stat-change.text-danger {
  color: #f56c6c;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.product-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.inventory-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.in-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.out-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.chart-card {
  height: 400px;
}

.trend-chart,
.pie-chart {
  width: 100%;
  height: 320px;
}

.warning-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.product-name {
  flex: 1;
  font-size: 14px;
}

.stock-qty {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}
</style>
