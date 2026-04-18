<template>
  <div class="system-container">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>

    <el-card v-loading="loading">
      <el-form :model="form" label-width="160px" :disabled="!canEdit" style="max-width: 720px;">
        <el-form-item label="系统名称">
          <el-input v-model="form.systemName" placeholder="例如：仓库管理系统" />
        </el-form-item>
        <el-form-item label="盘点频率">
          <el-select v-model="form.stocktakeFrequency" style="width: 220px;">
            <el-option label="每月" value="monthly" />
            <el-option label="每季度" value="quarterly" />
            <el-option label="每半年" value="half_year" />
            <el-option label="每年" value="yearly" />
          </el-select>
        </el-form-item>
        <el-form-item label="盘点提醒天数">
          <el-input-number
            v-model="form.stocktakeReminderDays"
            :min="0"
            :max="60"
            controls-position="right"
            style="width: 220px;"
          />
          <span style="margin-left: 8px; color: #909399;">提前 N 天发送提醒</span>
        </el-form-item>
        <el-form-item label="自动生成盘库单">
          <el-switch v-model="form.autoGenerateStocktake" />
        </el-form-item>
        <el-form-item label="库存预警阈值">
          <el-input-number
            v-model="form.stockWarningThreshold"
            :min="0"
            controls-position="right"
            style="width: 220px;"
          />
          <span style="margin-left: 8px; color: #909399;">兜底阈值（商品未单独配置时使用）</span>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="saving"
            @click="handleSave"
            :disabled="!canEdit"
          >
            保存
          </el-button>
          <el-button @click="fetchConfig">重置</el-button>
        </el-form-item>
        <el-alert
          v-if="!canEdit"
          type="info"
          show-icon
          :closable="false"
          title="只有管理员可以修改系统配置"
          style="margin-top: 12px;"
        />
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import systemApi from '@/api/system';
import { useGlobalStore } from '@/stores';

const store = useGlobalStore();
const loading = ref(false);
const saving = ref(false);

const form = ref({
  systemName: '',
  stocktakeFrequency: 'quarterly' as 'monthly' | 'quarterly' | 'half_year' | 'yearly',
  stocktakeReminderDays: 7,
  autoGenerateStocktake: true,
  stockWarningThreshold: 10,
});

const canEdit = computed(() => store.userInfo?.role === 'admin');

const fetchConfig = async () => {
  loading.value = true;
  try {
    const { data } = await systemApi.getConfig();
    const c = data.config || {};
    form.value = {
      systemName: c.systemName || '',
      stocktakeFrequency: c.stocktakeFrequency || 'quarterly',
      stocktakeReminderDays: c.stocktakeReminderDays ?? 7,
      autoGenerateStocktake: c.autoGenerateStocktake ?? true,
      stockWarningThreshold: c.stockWarningThreshold ?? 10,
    };
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '加载系统配置失败');
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    await systemApi.updateConfig({ ...form.value });
    ElMessage.success('系统配置已保存');
    await fetchConfig();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

onMounted(fetchConfig);
</script>

<style scoped>
.system-container {
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
