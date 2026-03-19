import request from '@/utils/request'

// 认证相关接口
export const authApi = {
  // 登录
  login: (data: { username: string; password: string }) => {
    return request({
      url: '/auth/login',
      method: 'post',
      data,
    })
  },

  // 退出登录
  logout: () => {
    return request({
      url: '/auth/logout',
      method: 'post',
    })
  },

  // 获取当前用户信息
  getProfile: () => {
    return request({
      url: '/auth/profile',
      method: 'get',
    })
  },

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }) => {
    return request({
      url: '/auth/change-password',
      method: 'put',
      data,
    })
  },

  // 注册用户（管理员权限）
  register: (data: any) => {
    return request({
      url: '/auth/register',
      method: 'post',
      data,
    })
  },
}

export default authApi
