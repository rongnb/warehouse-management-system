import request from '@/utils/request'

// 系统配置相关接口
export const systemApi = {
  // 获取系统配置
  getConfig: () => {
    return request({
      url: '/system/config',
      method: 'get',
    })
  },

  // 更新系统配置（仅管理员）
  updateConfig: (data: {
    stocktakeFrequency?: 'monthly' | 'quarterly' | 'half_year' | 'yearly'
    stocktakeReminderDays?: number
    autoGenerateStocktake?: boolean
    stockWarningThreshold?: number
    systemName?: string
    settings?: Record<string, any>
  }) => {
    return request({
      url: '/system/config',
      method: 'put',
      data,
    })
  },
}

export default systemApi
