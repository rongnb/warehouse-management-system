import request from '@/utils/request'

// OCR识别结果接口
export interface RecognitionResult {
  modelName: string
  manufacturer: string
  confidence: number
  ocrText: string
}

// OCR API
export const ocrApi = {
  // 上传图片进行OCR识别
  recognize: (imageFile: File) => {
    const formData = new FormData()
    formData.append('image', imageFile)

    return request({
      url: '/ocr/recognize',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(response => response.data)
  },

  // 获取OCR服务状态
  getStatus: () => {
    return request({
      url: '/ocr/status',
      method: 'get',
    })
  },
}

export default ocrApi
