import request from '@/utils/request'

// 交易记录（出入库）相关接口
export const transactionsApi = {
  // 获取交易列表
  getList: (params?: any) => {
    return request({
      url: '/transactions',
      method: 'get',
      params,
    })
  },

  // 获取交易详情
  getDetail: (id: string) => {
    return request({
      url: `/transactions/${id}`,
      method: 'get',
    })
  },

  // 创建入库单
  createInbound: (data: any) => {
    return request({
      url: '/transactions/inbound',
      method: 'post',
      data,
    })
  },

  // 创建出库单
  createOutbound: (data: any) => {
    return request({
      url: '/transactions/outbound',
      method: 'post',
      data,
    })
  },

  // 审核交易单
  audit: (id: string, data: { status: string; remark?: string }) => {
    return request({
      url: `/transactions/${id}/audit`,
      method: 'post',
      data,
    })
  },

  // 取消交易单
  cancel: (id: string, data: { reason: string }) => {
    return request({
      url: `/transactions/${id}/cancel`,
      method: 'post',
      data,
    })
  },

  // 导出交易记录
  export: (params?: any) => {
    return request({
      url: '/transactions/export',
      method: 'get',
      params,
      responseType: 'blob',
    })
  },
}

export default transactionsApi
