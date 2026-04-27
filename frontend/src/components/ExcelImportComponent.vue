<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="800px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="true"
      @close="errorMessage = ''"
      style="margin-bottom: 20px"
    />

    <!-- 文件上传区域 -->
    <el-upload
      ref="uploadRef"
      class="upload-area"
      drag
      action=""
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleFileChange"
      :before-upload="beforeUpload"
      accept=".xlsx,.xls"
    >
      <el-icon class="el-icon--upload"><Upload /></el-icon>
      <div class="el-upload__text">将文件拖到此处，或<em>点击选择文件</em></div>
      <template #tip>
        <div class="el-upload__tip">
          <el-alert
            title="支持 .xlsx 和 .xls 格式文件，文件大小不超过10MB"
            type="info"
            :closable="false"
            :bordered="false"
            style="margin: 10px 0"
          />
          <el-button type="primary" link @click="handleDownloadTemplate">
            <el-icon><Download /></el-icon>
            下载导入模板
          </el-button>
        </div>
      </template>
    </el-upload>

    <!-- 预览区域 -->
    <div v-if="previewData.length > 0" class="preview-section">
      <h4>数据预览 (前10条)</h4>
      <el-table :data="previewData" border style="width: 100%; margin-bottom: 15px;">
        <el-table-column prop="产品名称" label="产品名称" width="150" show-overflow-tooltip />
        <el-table-column prop="SKU" label="SKU" width="120" show-overflow-tooltip />
        <el-table-column prop="规格" label="规格" width="100" show-overflow-tooltip />
        <el-table-column prop="单位" label="单位" width="80" />
        <el-table-column prop="售价" label="售价" width="100" />
        <el-table-column prop="成本价" label="成本价" width="100" />
        <el-table-column prop="厂家" label="厂家" width="150" show-overflow-tooltip />
        <el-table-column prop="入库数量" label="入库数量" width="100" v-if="mode === 'inventory'" />
      </el-table>
    </div>

    <!-- 选项区域 -->
    <el-form v-if="mode === 'inventory'" :model="options" label-width="120px">
      <el-form-item label="仓库">
        <el-select v-model="options.warehouseId" placeholder="请选择仓库" style="width: 200px" required>
          <el-option
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :label="warehouse.name"
            :value="warehouse.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <!-- 进度条 -->
    <el-progress
      v-if="isImporting"
      :percentage="progress"
      :status="progress === 100 ? 'success' : 'active'"
      style="margin: 20px 0"
    />

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        @click="handleImport"
        :loading="isImporting"
        :disabled="!selectedFile || (mode === 'inventory' && !options.warehouseId)"
      >
        {{ isImporting ? '导入中...' : '开始导入' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Upload, Download } from '@element-plus/icons-vue';
import ExcelJS from 'exceljs';
import type { UploadInstance } from 'element-plus';
import { warehousesApi } from '@/api/warehouses';
import { productsApi } from '@/api/products';

interface Props {
  visible: boolean;
  mode: 'create' | 'inventory';
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'import-success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// 标题根据模式动态显示
const title = computed(() => {
  return props.mode === 'create' ? '新建商品导入' : '自动入库导入';
});

// 引用
const uploadRef = ref<UploadInstance>();
const selectedFile = ref<File | null>(null);
const previewData = ref<any[]>([]);
const isImporting = ref(false);
const progress = ref(0);
const errorMessage = ref('');

// 选项
const options = reactive({
  warehouseId: '',
});

// 仓库列表
const warehouses = ref<any[]>([]);

// 加载仓库列表
const loadWarehouses = async () => {
  try {
    const response = await warehousesApi.getOptions();
    warehouses.value = response.data.warehouses;
  } catch (error) {
    console.error('加载仓库列表失败:', error);
  }
};

// 文件改变时的处理
const handleFileChange = (file: any) => {
  selectedFile.value = file.raw;
  previewData.value = [];
  errorMessage.value = '';
  progress.value = 0;
  options.warehouseId = '';

  // 读取文件预览
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const buffer = e.target?.result as ArrayBuffer;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const firstSheet = workbook.worksheets[0];

      if (!firstSheet || firstSheet.rowCount <= 1) {
        errorMessage.value = '文件中没有数据';
        return;
      }

      // 将ExcelJS工作表转为JSON数组（第一行为表头）
      const headers: string[] = [];
      firstSheet.getRow(1).eachCell((cell: any, colNumber: number) => {
        headers[colNumber] = cell.value ? String(cell.value).trim() : '';
      });
      const jsonData: any[] = [];
      for (let rowNumber = 2; rowNumber <= firstSheet.rowCount; rowNumber++) {
        const row = firstSheet.getRow(rowNumber);
        const rowData: any = {};
        let hasValue = false;
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
          if (headers[colNumber]) {
            rowData[headers[colNumber]] = cell.value;
            if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
              hasValue = true;
            }
          }
        });
        if (hasValue) {
          jsonData.push(rowData);
        }
      }

      // 只显示前10条
      previewData.value = jsonData.slice(0, 10);
    } catch (error) {
      errorMessage.value = '文件格式不正确，请使用正确的导入模板';
    }
  };

  reader.readAsArrayBuffer(selectedFile.value);
};

// 上传前检查
const beforeUpload = (file: any) => {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isExcel) {
    ElMessage.error('只能上传 .xlsx 或 .xls 格式的文件');
    return false;
  }

  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB');
    return false;
  }

  return true;
};

// 下载导入模板
const handleDownloadTemplate = async () => {
  try {
    // 创建模板数据
    const templateData = [
      {
        '产品名称': '示例商品1',
        'SKU': 'PROD001',
        '规格': '100ml',
        '单位': '瓶',
        '售价': 10.00,
        '成本价': 5.00,
        '库存下限': 10,
        '库存上限': 1000,
        '用途': '示例用途',
        '产品型号': 'Model001',
        '厂家': '示例厂家',
        '备注': '示例备注',
        '入库数量': props.mode === 'inventory' ? 10 : '',
      },
      {
        '产品名称': '示例商品2',
        'SKU': 'PROD002',
        '规格': '500g',
        '单位': '袋',
        '售价': 20.00,
        '成本价': 10.00,
        '库存下限': 5,
        '库存上限': 500,
        '用途': '示例用途',
        '产品型号': 'Model002',
        '厂家': '示例厂家',
        '备注': '示例备注',
        '入库数量': props.mode === 'inventory' ? 20 : '',
      },
    ];

    // 创建工作簿和工作表
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('商品数据');

    // 添加表头
    const keys = Object.keys(templateData[0]);
    worksheet.addRow(keys);

    // 添加数据行
    templateData.forEach((item: any) => {
      worksheet.addRow(keys.map(k => item[k]));
    });

    // 导出文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商品导入模板_${props.mode === 'create' ? '新建商品' : '自动入库'}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    ElMessage.error('下载模板失败');
  }
};

// 开始导入
const handleImport = async () => {
  if (!selectedFile) {
    ElMessage.warning('请选择要导入的文件');
    return;
  }

  if (props.mode === 'inventory' && !options.warehouseId) {
    ElMessage.warning('请选择仓库');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要${props.mode === 'create' ? '新建商品' : '自动入库'}吗？导入过程可能需要几分钟时间。`,
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    isImporting.value = true;
    progress.value = 0;

    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('mode', props.mode);
    if (props.mode === 'inventory') {
      formData.append('warehouseId', options.warehouseId);
    }

    // 模拟进度
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += Math.floor(Math.random() * 10);
      }
    }, 500);

    // 发送请求
    const response = await productsApi.importProducts(formData);

    clearInterval(progressInterval);
    progress.value = 100;

    // 显示结果
    const { successCount, errorCount, errors } = response.data;

    if (errorCount > 0) {
      let errorText = `导入完成，但有 ${errorCount} 条数据失败：\n`;
      errors.forEach((err: any, index: number) => {
        if (index < 5) {
          errorText += `第${err.row}行：${err.error}\n`;
        }
      });

      if (errors.length > 5) {
        errorText += `... 还有 ${errors.length - 5} 条错误`;
      }

      await ElMessageBox.alert(errorText, '导入结果', {
        confirmButtonText: '确定',
        type: 'warning',
      });
    } else {
      ElMessage.success(`导入成功！共导入 ${successCount} 条数据`);
    }

    // 关闭弹窗
    visible.value = false;

    // 触发成功事件
    emit('import-success');
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('导入失败:', error);
      errorMessage.value = error.response?.data?.message || '导入失败，请稍后重试';
    }
  } finally {
    isImporting.value = false;
    progress.value = 0;
  }
};

// 处理关闭
const handleClosed = () => {
  selectedFile.value = null;
  previewData.value = [];
  errorMessage.value = '';
  progress.value = 0;
  options.warehouseId = '';
};

// 加载仓库列表（只有在入库模式时需要）
onMounted(() => {
  if (props.mode === 'inventory') {
    loadWarehouses();
  }
});

// 监听mode变化，切换到入库模式时重新加载仓库列表
watch(
  () => props.mode,
  (newMode) => {
    if (newMode === 'inventory') {
      loadWarehouses();
    }
  }
);
</script>

<style scoped>
.upload-area {
  margin-bottom: 20px;
}

.upload-area >>> .el-upload {
  width: 100%;
}

.upload-area >>> .el-upload-dragger {
  width: 100%;
}

.preview-section h4 {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

:deep(.el-alert__title) {
  font-size: 14px;
}
</style>
