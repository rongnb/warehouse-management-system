<template>
  <div class="reports-container">
    <div class="page-header">
      <h2>报表中心</h2>
    </div>

    <el-card>
      <el-form :model="form" label-width="100px" inline>
        <el-form-item label="报表类型" required>
          <el-select v-model="form.reportId" placeholder="请选择报表" style="width: 240px;">
            <el-option
              v-for="r in reports"
              :key="r.id"
              :label="r.name"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="导出格式">
          <el-select v-model="form.format" style="width: 120px;">
            <el-option label="Excel" value="excel" />
            <el-option label="CSV" value="csv" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            placeholder="可选"
            value-format="YYYY-MM-DD"
            style="width: 180px;"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="form.endDate"
            type="date"
            placeholder="可选"
            value-format="YYYY-MM-DD"
            style="width: 180px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="downloading" @click="handleExport">
            <el-icon><Download /></el-icon>
            生成并下载
          </el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <div v-if="selectedReport">
        <h3 style="margin: 0 0 12px;">{{ selectedReport.name }} - 字段</h3>
        <el-tag
          v-for="col in selectedReport.columns"
          :key="col.key"
          style="margin: 4px;"
        >
          {{ col.header }}
        </el-tag>
      </div>
      <el-empty v-else description="请选择一个报表" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import reportsApi from '@/api/reports';

interface ReportColumn { key: string; header: string }
interface ReportMeta { id: string; name: string; columns: ReportColumn[] }

const reports = ref<ReportMeta[]>([]);
const downloading = ref(false);

const form = ref({
  reportId: '',
  format: 'excel' as 'excel' | 'csv',
  startDate: '',
  endDate: '',
});

const selectedReport = computed(() => reports.value.find((r) => r.id === form.value.reportId));

const fetchReports = async () => {
  try {
    const { data } = await reportsApi.getList();
    reports.value = data.reports || [];
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '加载报表列表失败');
  }
};

const handleExport = async () => {
  if (!form.value.reportId) {
    ElMessage.warning('请选择报表');
    return;
  }
  downloading.value = true;
  try {
    const params: Record<string, any> = { format: form.value.format };
    if (form.value.startDate) params.startDate = form.value.startDate;
    if (form.value.endDate) params.endDate = form.value.endDate;

    const res = await reportsApi.generate(form.value.reportId, params);
    const blob = res.data as Blob;

    // 从 Content-Disposition 中提取文件名（fallback 到默认命名）
    const dispo = res.headers?.['content-disposition'] || '';
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(dispo);
    const ext = form.value.format === 'csv' ? 'csv' : 'xlsx';
    const fallback = `${form.value.reportId}-${Date.now()}.${ext}`;
    const fileName = match ? decodeURIComponent(match[1]) : fallback;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    ElMessage.success('报表已生成');
  } catch (e: any) {
    // Blob 错误响应需要解析后再展示
    const data = e?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const obj = JSON.parse(text);
        ElMessage.error(obj?.message || '生成报表失败');
      } catch {
        ElMessage.error('生成报表失败');
      }
    } else {
      ElMessage.error(data?.message || e?.message || '生成报表失败');
    }
  } finally {
    downloading.value = false;
  }
};

onMounted(fetchReports);
</script>

<style scoped>
.reports-container {
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
