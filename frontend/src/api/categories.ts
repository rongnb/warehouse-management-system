import request from '@/utils/request'

// 分类相关接口
export const categoriesApi = {
  // 获取分类列表
  getList: (params?: any) => {
    return request({
      url: '/categories',
      method: 'get',
      params,
    })
  },

  // 获取分类树
  getTree: () => {
    return request({
      url: '/categories/tree',
      method: 'get',
    })
  },

  // 获取分类详情
  getDetail: (id: string) => {
    return request({
      url: `/categories/${id}`,
      method: 'get',
    })
  },

  // 创建分类
  create: (data: any) => {
    return request({
      url: '/categories',
      method: 'post',
      data,
    })
  },

  // 更新分类
  update: (id: string, data: any) => {
    return request({
      url: `/categories/${id}`,
      method: 'put',
      data,
    })
  },

  // 删除分类
  delete: (id: string) => {
    return request({
      url: `/categories/${id}`,
      method: 'delete',
    })
  },

  // 获取分类选项（用于下拉选择）
  getOptions: () => {
    return request({
      url: '/categories/options',
      method: 'get',
    })
  },
}

export default categoriesApi
