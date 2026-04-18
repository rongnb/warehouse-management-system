import request from '@/utils/request'

// 仪表盘相关接口
export const dashboardApi = {
  // 获取统计数据
  getStats: () => {
    return request({
      url: '/dashboard/stats',
      method: 'get',
    })
  },

  // 获取低库存商品
  getLowStock: () => {
    return request({
      url: '/dashboard/low-stock',
      method: 'get',
    })
  },

  // 获取最近交易
  getRecentTransactions: () => {
    return request({
      url: '/dashboard/recent-transactions',
      method: 'get',
    })
  },

  // 获取出入库趋势数据
  getTrendData: (params?: { days?: number }) => {
    return request({
      url: '/dashboard/trend',
      method: 'get',
      params,
    })
  },

  // 获取分类占比数据
  getCategoryStats: () => {
    return request({
      url: '/dashboard/category-stats',
      method: 'get',
    })
  },

  // 获取最近出库记录
  getRecentOutbound: () => {
    return request({
      url: '/dashboard/recent-outbound',
      method: 'get',
    })
  },
}

export default dashboardApi
