import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
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
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', icon: 'dashboard' },
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products.vue'),
        meta: { title: '商品管理', icon: 'goods' },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/Inventory.vue'),
        meta: { title: '库存管理', icon: 's-order' },
      },
      {
        path: 'transactions',
        name: 'Transactions',
        component: () => import('@/views/Transactions.vue'),
        meta: { title: '出入库管理', icon: 's-marketing' },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/Categories.vue'),
        meta: { title: '分类管理', icon: 'tree' },
      },
      {
        path: 'suppliers',
        name: 'Suppliers',
        component: () => import('@/views/Suppliers.vue'),
        meta: { title: '供应商管理', icon: 'company' },
      },
      {
        path: 'warehouses',
        name: 'Warehouses',
        component: () => import('@/views/Warehouses.vue'),
        meta: { title: '仓库管理', icon: 'location' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: '用户管理', icon: 'user' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心', icon: 'avatar' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  
  if (to.meta.requiresAuth === false) {
    // 不需要认证的路由
    if (token && to.path === '/login') {
      // 已登录访问登录页，重定向到首页
      next('/dashboard');
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
