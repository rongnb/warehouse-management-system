import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import axios from 'axios';

interface UserInfo {
  id: string;
  username: string;
  realName: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
}

interface GlobalState {
  token: string | null;
  userInfo: UserInfo | null;
  loading: boolean;
  sidebarOpen: boolean;
  breadcrumb: Array<{ path: string; name: string }>;
}

export const useGlobalStore = defineStore('global', {
  state: (): GlobalState => ({
    token: localStorage.getItem('token'),
    userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')!) : null,
    loading: false,
    sidebarOpen: true,
    breadcrumb: [],
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.userInfo?.role === 'admin',
    isManager: (state) => ['admin', 'manager'].includes(state.userInfo?.role || ''),
  },

  actions: {
    async login(username: string, password: string) {
      try {
        const response = await authApi.login({
          username,
          password,
        });

        this.token = response.data.token;
        this.userInfo = response.data.user;

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));

        return response;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },

    async logout() {
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        this.token = null;
        this.userInfo = null;

        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
      }
    },

    async getUserProfile() {
      try {
        const response = await authApi.getProfile();
        this.userInfo = response.data.user;
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
        return response;
      } catch (error) {
        console.error('Get user profile failed:', error);
        // 如果获取用户信息失败，清除token
        this.logout();
      }
    },

    async changePassword(oldPassword: string, newPassword: string) {
      try {
        const response = await authApi.changePassword({
          oldPassword,
          newPassword,
        });
        return response;
      } catch (error) {
        console.error('Change password failed:', error);
        throw error;
      }
    },
  },
});

export const useLoadingStore = defineStore('loading', {
  state: () => ({
    isLoading: false,
    loadingText: '加载中...',
  }),

  actions: {
    show(text: string = '加载中...') {
      this.isLoading = true;
      this.loadingText = text;
    },

    hide() {
      this.isLoading = false;
    },
  },
});

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('请求错误详情:', error)

    if (error.response) {
      const { status, data, config } = error.response

      console.error('响应状态:', status)
      console.error('响应数据:', data)
      console.error('请求URL:', config.url)
      console.error('请求参数:', config.params || config.data)
    } else if (error.request) {
      console.error('网络错误，请检查网络连接')
    } else {
      console.error('请求配置错误')
    }

    if (error.response?.status === 401) {
      // token 过期或无效，清除本地存储
      const globalStore = useGlobalStore();
      globalStore.logout();
    }

    return Promise.reject(error);
  }
);

export { apiClient };
