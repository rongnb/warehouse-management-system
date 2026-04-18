import request from '@/utils/request'

// 报表相关接口
export const reportsApi = {
  // 获取所有可用报表的元数据
  getList: () => {
    return request({
      url: '/reports',
      method: 'get',
    })
  },

  // 生成并下载某个报表（流式返回 Excel/CSV）
  // 通过返回 Blob，便于在浏览器内触发下载
  generate: (id: string, params?: Record<string, any>) => {
    return request({
      url: `/reports/${id}`,
      method: 'get',
      params,
      responseType: 'blob',
    })
  },
}

export default reportsApi
