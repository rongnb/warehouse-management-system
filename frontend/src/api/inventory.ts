import request from '@/utils/request'

// 库存相关接口
export const inventoryApi = {
  // 获取库存列表
  getList: (params?: any) => {
    return request({
      url: '/inventory',
      method: 'get',
      params,
    })
  },

  // 获取库存详情
  getDetail: (id: string) => {
    return request({
      url: `/inventory/${id}`,
      method: 'get',
    })
  },

  // 获取低库存商品
  getLowStock: (params?: any) => {
    return request({
      url: '/inventory/low-stock',
      method: 'get',
      params,
    })
  },

  // 调整库存（通过ID）
  adjust: (id: string, data: { quantity: number; remark: string }) => {
    return request({
      url: `/inventory/${id}/adjust`,
      method: 'post',
      data,
    })
  },

  // 调整库存（通过产品和仓库）
  adjustByProductWarehouse: (data: { product: string; warehouse: string; quantity: number; remark: string }) => {
    return request({
      url: '/inventory/adjust',
      method: 'post',
      data,
    })
  },

  // 库存转移
  transfer: (data: {
    productId: string
    fromWarehouse: string
    toWarehouse: string
    quantity: number
    remark?: string
  }) => {
    return request({
      url: '/inventory/transfer',
      method: 'post',
      data,
    })
  },

  // 单条库存盘点（按商品+仓库录入实际数量）
  check: (data: { product: string; warehouse: string; actualQuantity: number; remark?: string }) => {
    return request({
      url: '/inventory/check',
      method: 'post',
      data,
    })
  },

  // 查询某个商品在所有仓库的库存
  getByProduct: (productId: string) => {
    return request({
      url: `/inventory/product/${productId}`,
      method: 'get',
    })
  },
}

export default inventoryApi
