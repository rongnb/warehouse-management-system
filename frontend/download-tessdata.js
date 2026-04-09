#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

// 语言包信息
const languages = [
  {
    name: 'chi_sim',
    url: 'https://github.com/tesseract-ocr/tessdata/raw/main/chi_sim.traineddata',
    filename: 'chi_sim.traineddata',
    size: '32MB'
  },
  {
    name: 'eng',
    url: 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata',
    filename: 'eng.traineddata',
    size: '23MB'
  }
]

// 下载目录
const outputDir = path.join(__dirname, 'public', 'tessdata')

// 创建目录
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`📁 创建目录: ${outputDir}`)
}

// 下载文件函数
const downloadFile = (url, outputPath) => {
  return new Promise((resolve, reject) => {
    console.log(`📦 正在下载: ${path.basename(outputPath)}`)

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`请求失败: ${response.statusCode} ${response.statusMessage}`))
      }

      const contentLength = response.headers['content-length']
      let downloaded = 0

      const writeStream = fs.createWriteStream(outputPath)

      response.on('data', (chunk) => {
        downloaded += chunk.length
        const percent = Math.round((downloaded / contentLength) * 100)
        process.stdout.write(`\r🚀 进度: ${percent}%`)
      })

      response.pipe(writeStream)

      writeStream.on('finish', () => {
        console.log(`\n✅ 下载完成: ${path.basename(outputPath)}`)
        resolve()
      })

      writeStream.on('error', (error) => {
        reject(error)
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

// 主函数
const main = async () => {
  console.log('🚀 开始下载Tesseract语言包')
  console.log(`📂 目标目录: ${outputDir}`)
  console.log('='.repeat(50))

  try {
    // 检查是否已存在语言包
    const existingFiles = languages.filter(lang => {
      return fs.existsSync(path.join(outputDir, lang.filename))
    })

    if (existingFiles.length > 0) {
      console.log(`⚠️  已存在的语言包: ${existingFiles.map(f => f.name).join(', ')}`)
    }

    // 下载不存在的语言包
    const missingLanguages = languages.filter(lang => {
      return !fs.existsSync(path.join(outputDir, lang.filename))
    })

    if (missingLanguages.length === 0) {
      console.log('✅ 所有语言包已存在！')
      return
    }

    console.log(`\n📥 需要下载的语言包: ${missingLanguages.map(f => f.name).join(', ')}`)

    for (const lang of missingLanguages) {
      const outputPath = path.join(outputDir, lang.filename)
      try {
        await downloadFile(lang.url, outputPath)
      } catch (error) {
        console.error(`\n❌ 下载 ${lang.name} 失败: ${error.message}`)
        // 尝试备用源
        console.log(`🔄 尝试备用源...`)
        const fallbackUrl = `https://tessdata.projectnaptha.com/4.0.0/${lang.filename}.gz`
        try {
          await downloadFile(fallbackUrl, outputPath + '.gz')
          console.log('🗜️ 解压中...')
          // 这里需要gunzip，但Node.js内置的zlib可以解
          const zlib = require('zlib')
          const gunzip = zlib.createGunzip()
          const input = fs.createReadStream(outputPath + '.gz')
          const output = fs.createWriteStream(outputPath)
          await new Promise((resolve, reject) => {
            input.pipe(gunzip).pipe(output)
            output.on('finish', resolve)
            output.on('error', reject)
          })
          fs.unlinkSync(outputPath + '.gz')
          console.log('✅ 解压完成')
        } catch (fallbackError) {
          console.error(`❌ 备用源下载也失败: ${fallbackError.message}`)
        }
      }
    }

    console.log('\n🎉 所有语言包下载完成！')
    console.log('\n📋 使用方法:')
    console.log('1. 确保文件在: frontend/public/tessdata/')
    console.log('2. 重启开发服务器')
    console.log('3. Tesseract将自动使用本地语言包')

  } catch (error) {
    console.error('❌ 错误:', error)
    process.exit(1)
  }
}

main()
