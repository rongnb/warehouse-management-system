import request from '@/utils/request'

// 供应商相关接口
export const suppliersApi = {
  // 获取供应商列表
  getList: (params?: any) => {
    return request({
      url: '/suppliers',
      method: 'get',
      params,
    })
  },

  // 获取供应商详情
  getDetail: (id: string) => {
    return request({
      url: `/suppliers/${id}`,
      method: 'get',
    })
  },

  // 创建供应商
  create: (data: any) => {
    return request({
      url: '/suppliers',
      method: 'post',
      data,
    })
  },

  // 更新供应商
  update: (id: string, data: any) => {
    return request({
      url: `/suppliers/${id}`,
      method: 'put',
      data,
    })
  },

  // 删除供应商
  delete: (id: string) => {
    return request({
      url: `/suppliers/${id}`,
      method: 'delete',
    })
  },

  // 获取供应商选项（用于下拉选择）
  getOptions: () => {
    return request({
      url: '/suppliers/options',
      method: 'get',
    })
  },
}

export default suppliersApi
