# Tesseract 语言包

## 下载语言包

### 中文简体 (chi_sim.traineddata)
- 下载地址: https://github.com/tesseract-ocr/tessdata/raw/main/chi_sim.traineddata
- 文件大小: ~32MB

### 英文 (eng.traineddata)
- 下载地址: https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata
- 文件大小: ~23MB

## 安装步骤

1. 下载上述两个 `.traineddata` 文件
2. 将文件放到这个目录 (`frontend/public/tessdata/`)
3. 重启开发服务器
4. 使用 `tessdata: '/tessdata/'` 配置使用本地语言包

## 备用下载源

如果GitHub下载慢，可以使用：
- https://tessdata.projectnaptha.com/4.0.0/chi_sim.traineddata.gz
- https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz

注意：需要先解压.gz文件
