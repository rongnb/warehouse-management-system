import { createApp } from 'vue'
import App from './App.vue'

// 引入路由
import router from '@/router'

// 引入Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入响应式样式
import '@/styles/responsive.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 引入Pinia状态管理
import { createPinia } from 'pinia'

// 引入图像识别工具（使用新的单例API）
import { initializeImageRecognizer } from '@/utils/imageRecognition'

console.log('🚀 应用启动，开始预加载图像识别引擎...')

// 预加载图像识别引擎（后台运行，不阻塞UI）
initializeImageRecognizer().then(success => {
  if (success) {
    console.log('✅ 图像识别引擎预加载成功')
  } else {
    console.warn('⚠️ 图像识别引擎预加载失败，将在需要时延迟加载')
  }
}).catch(error => {
  console.error('❌ 图像识别引擎预加载出错:', error)
})

const app = createApp(App)

// 注册Element Plus和图标
app.use(ElementPlus)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册Pinia
app.use(createPinia())

// 注册路由
app.use(router)

app.mount('#app')
