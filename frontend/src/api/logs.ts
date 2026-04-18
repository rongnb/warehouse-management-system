import request from '@/utils/request'

// 日志相关接口（仅管理员）
export const logsApi = {
  // 日志文件列表
  getFiles: () => {
    return request({
      url: '/logs/files',
      method: 'get',
    })
  },

  // 读取某个日志文件的最后 N 行
  getFile: (filename: string, lines = 200) => {
    return request({
      url: `/logs/file/${encodeURIComponent(filename)}`,
      method: 'get',
      params: { lines },
    })
  },

  // 下载日志文件（返回 Blob）
  download: (filename: string) => {
    return request({
      url: `/logs/download/${encodeURIComponent(filename)}`,
      method: 'get',
      responseType: 'blob',
    })
  },

  // 删除日志文件
  delete: (filename: string) => {
    return request({
      url: `/logs/file/${encodeURIComponent(filename)}`,
      method: 'delete',
    })
  },

  // 系统状态概览
  getStatus: () => {
    return request({
      url: '/logs/status',
      method: 'get',
    })
  },
}

export default logsApi
