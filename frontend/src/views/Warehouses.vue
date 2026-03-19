<template>
  <div class="warehouses-container">
    <div class="page-header">
      <h2>仓库管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增仓库
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline label-width="80px">
        <el-form-item label="关键词搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入仓库名称、编码或位置"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
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

    <!-- 仓库列表 -->
    <el-card class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="code" label="仓库编码" width="120" />
        <el-table-column prop="name" label="仓库名称" min-width="180" />
        <el-table-column prop="manager" label="负责人" width="120">
          <template #default="{ row }">
            {{ row.manager?.realName || row.manager || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="location" label="地址" min-width="200" />
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
      :title="isEdit ? '编辑仓库' : '新增仓库'"
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
            <el-form-item label="仓库编码" prop="code">
              <el-input v-model="form.code" placeholder="请输入仓库编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入仓库名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="manager">
              <el-input v-model="form.manager" placeholder="请输入负责人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="地址" prop="location">
              <el-input v-model="form.location" placeholder="请输入地址" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入备注"
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { warehousesApi } from '@/api/warehouses';

const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const tableData = ref([]);

const searchForm = reactive({
  keyword: '',
  status: undefined as boolean | undefined,
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const form = reactive({
  id: '',
  code: '',
  name: '',
  manager: '',
  phone: '',
  location: '',
  description: '',
  status: true,
  sort: 0,
});

const rules = reactive<FormRules>({
  code: [{ required: true, message: '请输入仓库编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }],
  manager: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
  ],
  location: [{ required: true, message: '请输入地址', trigger: 'blur' }],
});

// 加载仓库列表
const loadWarehouses = async () => {
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword,
      status: searchForm.status,
    };

    const response = await warehousesApi.getList(params);
    tableData.value = response.data.warehouses;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    console.error('加载仓库列表失败:', error);
    ElMessage.error('加载仓库列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadWarehouses();
};

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: undefined,
  });
  handleSearch();
};

const handleAdd = () => {
  isEdit.value = false;
  Object.assign(form, {
    id: '',
    code: '',
    name: '',
    manager: '',
    phone: '',
    location: '',
    description: '',
    status: true,
    sort: 0,
  });
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  Object.assign(form, {
    id: row._id || row.id,
    code: row.code,
    name: row.name,
    manager: row.manager?._id || row.manager,
    phone: row.phone,
    location: row.location,
    description: row.description,
    status: row.status,
    sort: row.sort || 0,
  });
  dialogVisible.value = true;
};

const handleView = (row: any) => {
  ElMessage.info('查看功能开发中');
};

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该仓库吗？删除后无法恢复。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await warehousesApi.delete(row.id);
    ElMessage.success('删除成功');
    loadWarehouses();
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

    // 准备提交数据
    const submitData = {
      ...form,
    };

    if (isEdit.value) {
      await warehousesApi.update(form.id, submitData);
      ElMessage.success('更新成功');
    } else {
      await warehousesApi.create(submitData);
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    loadWarehouses();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitLoading.value = false;
  }
};

onMounted(() => {
  loadWarehouses();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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
</style>
