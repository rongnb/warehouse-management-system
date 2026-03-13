import request from '@/utils/request';

// 盘库相关接口
export const stocktakeApi = {
  // 获取盘库列表
  getList: (params: any) => {
    return request({
      url: '/api/stocktake',
      method: 'get',
      params,
    });
  },

  // 获取盘库详情
  getDetail: (id: string) => {
    return request({
      url: `/api/stocktake/${id}`,
      method: 'get',
    });
  },

  // 创建盘库单
  create: (data: any) => {
    return request({
      url: '/api/stocktake',
      method: 'post',
      data,
    });
  },

  // 更新盘库单
  update: (id: string, data: any) => {
    return request({
      url: `/api/stocktake/${id}`,
      method: 'put',
      data,
    });
  },

  // 提交盘库单
  submit: (id: string) => {
    return request({
      url: `/api/stocktake/${id}/submit`,
      method: 'post',
    });
  },

  // 核实盘库单
  confirm: (id: string, data: any) => {
    return request({
      url: `/api/stocktake/${id}/confirm`,
      method: 'post',
      data,
    });
  },

  // 取消盘库单
  cancel: (id: string, data: any) => {
    return request({
      url: `/api/stocktake/${id}/cancel`,
      method: 'post',
      data,
    });
  },

  // 导出盘库报表
  export: (id: string) => {
    return request({
      url: `/api/stocktake/${id}/export`,
      method: 'get',
      responseType: 'blob',
    });
  },
};

export default stocktakeApi;
