import request from '@/utils/request'

// 用户相关接口
export const usersApi = {
  // 获取用户列表
  getList: (params?: any) => {
    return request({
      url: '/users',
      method: 'get',
      params,
    })
  },

  // 获取单个用户信息
  getDetail: (id: string) => {
    return request({
      url: `/users/${id}`,
      method: 'get',
    })
  },

  // 创建用户
  create: (data: any) => {
    return request({
      url: '/users',
      method: 'post',
      data,
    })
  },

  // 更新用户
  update: (id: string, data: any) => {
    return request({
      url: `/users/${id}`,
      method: 'put',
      data,
    })
  },

  // 删除用户
  delete: (id: string) => {
    return request({
      url: `/users/${id}`,
      method: 'delete',
    })
  },

  // 获取用户选项（用于下拉选择）
  getOptions: () => {
    return request({
      url: '/users/options',
      method: 'get',
    })
  },
}

export default usersApi
