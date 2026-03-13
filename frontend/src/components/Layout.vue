<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarOpen ? '220px' : '64px'" class="layout-sidebar">
      <div class="logo">
        <el-icon :size="24">
          <Box />
        </el-icon>
        <span v-if="sidebarOpen" class="logo-text">仓库管理系统</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="layout-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        :collapse="!sidebarOpen"
        router
        unique-opened
      >
        <el-menu-item index="/stocktake">
          <el-icon><Goods /></el-icon>
          <template #title>库存盘点</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="sidebar-toggle" @click="toggleSidebar">
            <Fold v-if="sidebarOpen" />
            <Expand v-else />
          </el-icon>
          
          <el-breadcrumb class="breadcrumb" separator="/">
            <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleDropdownCommand">
            <span class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ userInfo?.realName?.charAt(0) || '用' }}
              </el-avatar>
              <span class="user-name">{{ userInfo?.realName || '用户' }}</span>
              <el-icon class="user-arrow"><ArrowDown /></el-icon>
            </span>
            
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <!-- 底部 -->
      <el-footer class="layout-footer">
        © 2026 仓库管理系统 - 版权所有
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGlobalStore } from '@/stores';
import { 
  Box, 
  Goods, 
  Fold, 
  Expand, 
  ArrowDown, 
  SwitchButton 
} from '@element-plus/icons-vue';

const store = useGlobalStore();
const route = useRoute();
const router = useRouter();

const sidebarOpen = computed({
  get: () => store.sidebarOpen,
  set: (val) => {
    store.sidebarOpen = val;
  },
});

const activeMenu = computed(() => {
  const currentPath = route.path;
  return currentPath;
});

const userInfo = computed(() => store.userInfo);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};



const handleDropdownCommand = (command: string) => {
  switch (command) {
    case 'logout':
      handleLogout();
      break;
  }
};

const handleLogout = async () => {
  await store.logout();
  router.push('/login');
};

onMounted(() => {
  if (!store.userInfo) {
    store.getUserProfile();
  }
});
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-sidebar {
  background-color: #304156;
  border-right: 1px solid #dcdfe6;
  overflow: hidden;
  transition: width 0.3s ease;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  background-color: #263445;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  padding: 0 16px;
  transition: all 0.3s ease;
}

.logo-text {
  margin-left: 12px;
  white-space: nowrap;
}

.layout-menu {
  border-right: none;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 24px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.sidebar-toggle {
  cursor: pointer;
  color: #606266;
  margin-right: 16px;
  font-size: 20px;
  transition: color 0.3s;
}

.sidebar-toggle:hover {
  color: #409EFF;
}

.breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-badge {
  cursor: pointer;
  color: #606266;
}

.notification-badge:hover {
  color: #409EFF;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-avatar {
  background-color: #409EFF;
  color: #fff;
}

.user-name {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}

.user-arrow {
  margin-left: 4px;
  font-size: 12px;
}

.layout-main {
  background-color: #f5f7fa;
  padding: 24px;
  overflow: auto;
}

.layout-footer {
  text-align: center;
  background-color: #fff;
  color: #909399;
  font-size: 12px;
  border-top: 1px solid #dcdfe6;
}
</style>
