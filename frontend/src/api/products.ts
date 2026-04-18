import request from '@/utils/request'

// 商品相关接口
export const productsApi = {
  // 获取商品列表
  getList: (params?: any) => {
    return request({
      url: '/products',
      method: 'get',
      params,
    })
  },

  // 获取商品详情
  getDetail: (id: string) => {
    return request({
      url: `/products/${id}`,
      method: 'get',
    })
  },

  // 创建商品
  create: (data: any) => {
    return request({
      url: '/products',
      method: 'post',
      data,
    })
  },

  // 更新商品
  update: (id: string, data: any) => {
    return request({
      url: `/products/${id}`,
      method: 'put',
      data,
    })
  },

  // 删除商品
  delete: (id: string) => {
    return request({
      url: `/products/${id}`,
      method: 'delete',
    })
  },

  // 获取商品选项（用于下拉选择）
  getOptions: () => {
    return request({
      url: '/products/options',
      method: 'get',
    })
  },

  // 通过 Excel 文件批量导入商品
  // file: 浏览器侧 File 对象（来自 <input type="file">）
  import: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request({
      url: '/products/import',
      method: 'post',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default productsApi
