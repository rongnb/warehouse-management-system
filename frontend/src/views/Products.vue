<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">商品管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增商品
      </el-button>
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
              <el-input v-model="form.sku" placeholder="请输入SKU" />
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
          <el-col :span="24">
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
  Delete 
} from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { apiClient } from '@/stores';

const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
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
  unit: '个',
  price: 0,
  costPrice: 0,
  minStock: 0,
  maxStock: 99999,
  status: true,
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  sku: [{ required: true, message: '请输入SKU', trigger: 'blur' }],
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
    unit: '个',
    price: 0,
    costPrice: 0,
    minStock: 0,
    maxStock: 99999,
    status: true,
  });
  dialogVisible.value = true;
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
    unit: row.unit,
    price: row.price,
    costPrice: row.costPrice,
    minStock: row.minStock,
    maxStock: row.maxStock,
    status: row.status,
  });
  dialogVisible.value = true;
};

const handleView = (row: any) => {
  // 跳转到商品详情页
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
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
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

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.search-card {
  margin-bottom