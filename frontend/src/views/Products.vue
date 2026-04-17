<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">商品管理</h2>
      <div class="header-buttons">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增商品
        </el-button>
        <el-button type="success" @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          导入商品
        </el-button>
        <el-button @click="handleDownloadTemplate">
          <el-icon><Download /></el-icon>
          下载模板
        </el-button>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline label-width="80px">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="商品名称/SKU"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="分类">
          <el-select
            v-model="searchForm.category"
            placeholder="请选择分类"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="供应商">
          <el-select
            v-model="searchForm.supplier"
            placeholder="请选择供应商"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="supplier in suppliers"
              :key="supplier.id"
              :label="supplier.name"
              :value="supplier.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 商品列表 -->
    <el-card class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="sku" label="SKU" width="140" />
        <el-table-column prop="name" label="商品名称" min-width="180" />
        <el-table-column prop="categoryName" label="分类" width="120" />
        <el-table-column prop="supplierName" label="供应商" width="140" />
        <el-table-column prop="specification" label="规格" width="120" />
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column prop="price" label="售价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ row.price?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="costPrice" label="成本价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ row.costPrice?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.stock <= row.minStock ? 'danger' : 'success'">
              {{ row.stock || 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'">
              {{ row.status ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="primary" text size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑商品' : '新增商品'"
      width="700px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="商品名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入商品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SKU" prop="sku">
              <el-input
                v-model="form.sku"
                :placeholder="isEdit ? '请输入SKU' : '不填则自动生成'"
                :disabled="!isEdit"
              />
              <div v-if="!isEdit" style="font-size: 12px; color: #909399; margin-top: 4px;">
                新增商品时，SKU会自动生成
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select
                v-model="form.category"
                placeholder="请选择分类"
                style="width: 100%"
              >
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier">
              <el-select
                v-model="form.supplier"
                placeholder="请选择供应商"
                style="width: 100%"
              >
                <el-option
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格">
              <el-input v-model="form.specification" placeholder="请输入规格" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商品型号">
              <div style="display: flex; gap: 8px;">
                <el-input v-model="form.modelName" placeholder="请输入商品型号" />
                <el-button type="primary" @click="showOCRDialog = true" title="拍照识别">
                  <el-icon><Camera /></el-icon>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产厂家">
              <el-input v-model="form.manufacturer" placeholder="请输入生产厂家" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="form.unit" placeholder="请输入单位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="售价" prop="price">
              <el-input-number
                v-model="form.price"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成本价" prop="costPrice">
              <el-input-number
                v-model="form.costPrice"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最低库存" prop="minStock">
              <el-input-number
                v-model="form.minStock"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最高库存" prop="maxStock">
              <el-input-number
                v-model="form.maxStock"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="描述">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入商品描述"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入商品"
      width="600px"
      destroy-on-close
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card
            class="import-card"
            :class="{ 'is-active': importMode === 'create' }"
            shadow="hover"
            @click="handleImportMode('create')"
          >
            <div class="import-card-icon">
              <el-icon :size="40"><DocumentAdd /></el-icon>
            </div>
            <div class="import-card-title">新建商品</div>
            <div class="import-card-desc">导入新商品信息，自动创建商品档案</div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card
            class="import-card"
            :class="{ 'is-active': importMode === 'inventory' }"
            shadow="hover"
            @click="handleImportMode('inventory')"
          >
            <div class="import-card-icon">
              <el-icon :size="40"><Box /></el-icon>
            </div>
            <div class="import-card-title">自动入库</div>
            <div class="import-card-desc">创建商品同时自动入库到指定仓库</div>
          </el-card>
        </el-col>
      </el-row>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="startImport" :disabled="!importMode">
          下一步
        </el-button>
      </template>
    </el-dialog>

    <!-- Excel导入组件 -->
    <ExcelImportComponent
      v-model:visible="showExcelImportDialog"
      :mode="importMode"
      @import-success="handleImportSuccess"
    />

    <!-- OCR识别对话框 -->
    <el-dialog
      v-model="showOCRDialog"
      title="OCR商品识别"
      width="600px"
      destroy-on-close
      :before-close="handleOCRDialogClose"
    >
      <ImageRecognitionComponent
        :products="tableData"
        @result="handleOCRResult"
        @cancel="showOCRDialog = false"
      />
      <template #footer>
        <el-button @click="showOCRDialog = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  Plus,
  Search,
  Refresh,
  View,
  Edit,
  Delete,
  Upload,
  DocumentAdd,
  Box,
  Download,
  Camera
} from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { apiClient } from '@/stores';
import ExcelImportComponent from '@/components/ExcelImportComponent.vue';
import ImageRecognitionComponent from '@/components/ImageRecognitionComponent.vue';
import ExcelJS from 'exceljs';
import type { RecognitionResult } from '@/utils/imageRecognition';

const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const showImportDialog = ref(false);
const showExcelImportDialog = ref(false);
const showOCRDialog = ref(false);
const importMode = ref<'create' | 'inventory'>('create');
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const tableData = ref([]);
const categories = ref([]);
const suppliers = ref([]);

const searchForm = reactive({
  keyword: '',
  category: '',
  supplier: '',
  status: undefined as boolean | undefined,
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const form = reactive({
  id: '',
  name: '',
  sku: '',
  category: '',
  supplier: '',
  description: '',
  specification: '',
  modelName: '',
  manufacturer: '',
  unit: '个',
  price: 0,
  costPrice: 0,
  minStock: 0,
  maxStock: 99999,
  status: true,
  remark: '',
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  // SKU在编辑时必填，新增时自动生成
  sku: (isEdit.value ? [{ required: true, message: '请输入SKU', trigger: 'blur' }] : []),
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  supplier: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  price: [{ required: true, message: '请输入售价', trigger: 'blur' }],
  costPrice: [{ required: true, message: '请输入成本价', trigger: 'blur' }],
});

// 加载商品列表
const loadProducts = async () => {
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm,
    };

    const response = await apiClient.get('/api/products', { params });
    tableData.value = response.data.products;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    console.error('加载商品列表失败:', error);
    ElMessage.error('加载商品列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载分类和供应商
const loadOptions = async () => {
  try {
    const [categoriesRes, suppliersRes] = await Promise.all([
      apiClient.get('/api/categories/options'),
      apiClient.get('/api/suppliers/options'),
    ]);

    categories.value = categoriesRes.data.categories;
    suppliers.value = suppliersRes.data.suppliers;
  } catch (error) {
    console.error('加载选项失败:', error);
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadProducts();
};

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    category: '',
    supplier: '',
    status: undefined,
  });
  handleSearch();
};

const handleAdd = () => {
  isEdit.value = false;
  Object.assign(form, {
    id: '',
    name: '',
    sku: '',
    category: '',
    supplier: '',
    description: '',
    specification: '',
    modelName: '',
    manufacturer: '',
    unit: '个',
    price: 0,
    costPrice: 0,
    minStock: 0,
    maxStock: 99999,
    status: true,
    remark: '',
  });
  dialogVisible.value = true;
};

// 处理导入模式选择
const handleImportMode = (mode: 'create' | 'inventory') => {
  importMode.value = mode;
};

// 开始导入
const startImport = () => {
  showImportDialog.value = false;
  showExcelImportDialog.value = true;
};

// 导入成功回调
const handleImportSuccess = () => {
  ElMessage.success('导入成功');
  loadProducts();
};

// 下载模板
const handleDownloadTemplate = () => {
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
        '入库数量': '',
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
        '入库数量': '',
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
    a.download = '商品导入模板.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('模板下载成功');
  } catch (error) {
    ElMessage.error('下载模板失败');
  }
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  Object.assign(form, {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    supplier: row.supplier,
    description: row.description,
    specification: row.specification,
    modelName: row.modelName || '',
    manufacturer: row.manufacturer || '',
    unit: row.unit,
    price: row.price,
    costPrice: row.costPrice,
    minStock: row.minStock,
    maxStock: row.maxStock,
    status: row.status,
    remark: row.remark || '',
  });
  dialogVisible.value = true;
};

const handleView = (row: any) => {
  ElMessage.info('查看功能开发中');
};

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该商品吗？删除后无法恢复。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await apiClient.delete(`/api/products/${row.id}`);
    ElMessage.success('删除成功');
    loadProducts();
  } catch (error: any) {
    if (error !== 'cancel') {
      const errorMsg = error.response?.data?.message || '删除失败';
      ElMessage.error(errorMsg);
    }
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      await apiClient.put(`/api/products/${form.id}`, form);
      ElMessage.success('更新成功');
    } else {
      await apiClient.post('/api/products', form);
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    loadProducts();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitLoading.value = false;
  }
};

// 处理OCR识别结果
const handleOCRResult = (result: RecognitionResult, createNew?: boolean) => {
  // 将识别结果填入表单
  form.modelName = result.modelName;
  form.manufacturer = result.manufacturer;

  // 如果找到了匹配的商品，可以自动填充更多信息
  if (createNew === false) {
    // 可以在这里添加匹配商品的逻辑
  }

  showOCRDialog.value = false;
  ElMessage.success('识别成功，已自动填充表单');
};

// 关闭OCR对话框
const handleOCRDialogClose = () => {
  showOCRDialog.value = false;
};

onMounted(() => {
  loadOptions();
  loadProducts();
});
</script>

<style scoped>
.page-container {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.search-card {
  margin-bottom: 24px;
}

.table-card {
  margin-bottom: 24px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.import-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  text-align: center;
  padding: 30px 20px;
  height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.import-card.is-active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.import-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.import-card-icon {
  margin-bottom: 15px;
  color: #409eff;
}

.import-card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #303133;
}

.import-card-desc {
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

</style>
