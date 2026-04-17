import { createApp } from 'vue'
import App from './App.vue'

// 引入路由
import router from '@/router'

// 引入Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 引入响应式样式
import '@/styles/global.css'
import '@/styles/responsive.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 引入Pinia状态管理
import { createPinia } from 'pinia'

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
