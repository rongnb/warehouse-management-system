import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/stocktake',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/components/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'stocktake',
        name: 'Stocktake',
        component: () => import('@/views/Stocktake.vue'),
        meta: { title: '库存盘点', icon: 's-check' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/stocktake',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  
  if (to.meta.requiresAuth === false) {
    // 不需要认证的路由
    if (token && to.path === '/login') {
      // 已登录访问登录页，重定向到库存盘点页
      next('/stocktake');
    } else {
      next();
    }
  } else {
    // 需要认证的路由
    if (token) {
      next();
    } else {
      next('/login');
    }
  }
});

export default router;
