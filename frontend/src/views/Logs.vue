<template>
  <div class="logs-container">
    <div class="page-header">
      <h2>日志管理</h2>
      <el-button @click="fetchAll">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :md="14">
        <el-card v-loading="loadingFiles">
          <template #header>
            <span>日志文件列表</span>
          </template>
          <el-table :data="files" size="small" highlight-current-row @row-click="(row: any) => handleView(row)">
            <el-table-column prop="name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="type" label="类型" width="90">
              <template #default="{ row }">
                <el-tag :type="tagType(row.type)" size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sizeFormatted" label="大小" width="100" />
            <el-table-column prop="modifiedAt" label="最后修改" width="170">
              <template #default="{ row }">
                {{ formatDate(row.modifiedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click.stop="handleView(row)">查看</el-button>
                <el-button type="success" link @click.stop="handleDownload(row)">下载</el-button>
                <el-button type="danger" link @click.stop="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无日志文件" />
            </template>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="10">
        <el-card v-loading="loadingStatus">
          <template #header>
            <span>系统状态</span>
          </template>
          <el-descriptions :column="1" border size="small" v-if="status">
            <el-descriptions-item label="健康状态">
              <el-tag type="success">{{ status.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="运行时长">{{ status.uptime?.formatted }}</el-descriptions-item>
            <el-descriptions-item label="Node 版本">{{ status.node?.version }}</el-descriptions-item>
            <el-descriptions-item label="环境">{{ status.node?.env }}</el-descriptions-item>
            <el-descriptions-item label="堆内存使用">
              {{ status.memory?.heapUsedFormatted }} / {{ status.memory?.heapTotalFormatted }}
            </el-descriptions-item>
            <el-descriptions-item label="RSS 内存">{{ status.memory?.rssFormatted }}</el-descriptions-item>
            <el-descriptions-item label="日志目录大小">{{ status.logs?.totalSizeFormatted }}</el-descriptions-item>
            <el-descriptions-item label="磁盘 - 总量">{{ status.disk?.totalFormatted || status.disk?.total }}</el-descriptions-item>
            <el-descriptions-item label="磁盘 - 已用">
              {{ status.disk?.usedFormatted || status.disk?.used }}
              <span v-if="status.disk?.usedPercent != null"> ({{ status.disk.usedPercent }}%)</span>
            </el-descriptions-item>
            <el-descriptions-item label="磁盘 - 可用">{{ status.disk?.availableFormatted || status.disk?.available }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="viewerOpen" :title="`查看：${current?.name || ''}`" width="80%" top="5vh">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <span>显示行数：</span>
        <el-input-number v-model="lines" :min="50" :max="5000" :step="100" size="small" />
        <el-button size="small" type="primary" @click="loadContent" :loading="loadingContent">重新加载</el-button>
      </div>
      <pre class="log-pre" v-loading="loadingContent">{{ content || '（空）' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import logsApi from '@/api/logs';

interface LogFile {
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
  modifiedAt: string;
}

const files = ref<LogFile[]>([]);
const status = ref<any>(null);
const loadingFiles = ref(false);
const loadingStatus = ref(false);
const loadingContent = ref(false);

const viewerOpen = ref(false);
const current = ref<LogFile | null>(null);
const content = ref('');
const lines = ref(200);

const tagType = (t: string) => {
  if (t === 'error') return 'danger';
  if (t === 'warn') return 'warning';
  if (t === 'access') return 'info';
  if (t === 'combined') return 'success';
  return '';
};

const formatDate = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleString(); } catch { return s; }
};

const fetchFiles = async () => {
  loadingFiles.value = true;
  try {
    const { data } = await logsApi.getFiles();
    files.value = data.files || [];
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '加载日志文件失败');
  } finally {
    loadingFiles.value = false;
  }
};

const fetchStatus = async () => {
  loadingStatus.value = true;
  try {
    const { data } = await logsApi.getStatus();
    status.value = data;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '加载系统状态失败');
  } finally {
    loadingStatus.value = false;
  }
};

const fetchAll = () => Promise.all([fetchFiles(), fetchStatus()]);

const loadContent = async () => {
  if (!current.value) return;
  loadingContent.value = true;
  try {
    const { data } = await logsApi.getFile(current.value.name, lines.value);
    content.value = data.content || '';
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '加载日志内容失败');
  } finally {
    loadingContent.value = false;
  }
};

const handleView = (row: LogFile) => {
  current.value = row;
  content.value = '';
  viewerOpen.value = true;
  loadContent();
};

const handleDownload = async (row: LogFile) => {
  try {
    const res = await logsApi.download(row.name);
    const blob = res.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = row.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '下载失败');
  }
};

const handleDelete = async (row: LogFile) => {
  try {
    await ElMessageBox.confirm(`确定删除日志文件「${row.name}」吗？此操作不可恢复。`, '确认删除', {
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await logsApi.delete(row.name);
    ElMessage.success('删除成功');
    await fetchAll();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '删除失败');
  }
};

onMounted(fetchAll);
</script>

<style scoped>
.logs-container {
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.log-pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  max-height: 60vh;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border-radius: 4px;
  margin: 0;
}
</style>
