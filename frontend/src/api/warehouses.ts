import request from '@/utils/request'

// 仓库相关接口
export const warehousesApi = {
  // 获取仓库列表
  getList: (params?: any) => {
    return request({
      url: '/warehouses',
      method: 'get',
      params,
    })
  },

  // 获取仓库详情
  getDetail: (id: string) => {
    return request({
      url: `/warehouses/${id}`,
      method: 'get',
    })
  },

  // 创建仓库
  create: (data: any) => {
    return request({
      url: '/warehouses',
      method: 'post',
      data,
    })
  },

  // 更新仓库
  update: (id: string, data: any) => {
    return request({
      url: `/warehouses/${id}`,
      method: 'put',
      data,
    })
  },

  // 删除仓库
  delete: (id: string) => {
    return request({
      url: `/warehouses/${id}`,
      method: 'delete',
    })
  },

  // 获取仓库选项（用于下拉选择）
  getOptions: () => {
    return request({
      url: '/warehouses/options',
      method: 'get',
    })
  },
}

export default warehousesApi
