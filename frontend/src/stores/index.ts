import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';

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
