<template>
  <div class="categories-container">
    <div class="page-header">
      <h2>分类管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增分类
      </el-button>
    </div>

    <!-- 分类树和列表 -->
    <el-row :gutter="24">
      <el-col :span="8">
        <el-card class="tree-card">
          <template #header>
            <div class="card-header">
              <span>分类树</span>
              <el-button type="text" @click="handleRefreshTree">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-tree
            :data="categoryTree"
            :props="defaultProps"
            :default-expanded-keys="expandedKeys"
            :default-checked-keys="checkedKeys"
            :default-selected-keys="selectedKeys"
            node-key="id"
            ref="treeRef"
            @node-click="handleNodeClick"
            @node-contextmenu="handleNodeContextMenu"
            style="height: 500px; overflow-y: auto"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span>{{ node.label }}</span>
                <span class="node-actions">
                  <el-button
                    type="text"
                    size="small"
                    @click.stop="handleAddChild(data)"
                    v-if="node.level < 3"
                  >
                    <el-icon><Plus /></el-icon>
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click.stop="handleEdit(data)"
                  >
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                  <el-button
                    type="text"
                    size="small"
                    @click.stop="handleDelete(data)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </span>
              </span>
            </template>
          </el-tree>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card class="detail-card">
          <template #header>
            <div class="card-header">
              <span>分类详情</span>
              <el-button type="text" @click="handleRefreshDetail">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>

          <el-empty v-if="!currentCategory" description="请选择分类" />

          <el-form
            v-else
            :model="currentCategory"
            label-width="100px"
            class="category-form"
          >
            <el-form-item label="分类ID">
              <el-input v-model="currentCategory.id" disabled />
            </el-form-item>
            <el-form-item label="分类名称">
              <el-input v-model="currentCategory.name" />
            </el-form-item>
            <el-form-item label="上级分类">
              <el-input
                v-model="currentCategory.parentName"
                disabled
                placeholder="无"
              />
            </el-form-item>
            <el-form-item label="分类编码">
              <el-input v-model="currentCategory.code" />
            </el-form-item>
            <el-form-item label="分类层级">
              <el-input v-model="currentCategory.level" disabled />
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number
                v-model="currentCategory.sort"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-switch
                v-model="currentCategory.status"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
            <el-form-item label="描述">
              <el-input
                v-model="currentCategory.description"
                type="textarea"
                :rows="3"
              />
            </el-form-item>
          </el-form>

          <div class="form-actions" v-if="currentCategory">
            <el-button @click="handleCancelEdit">取消</el-button>
            <el-button type="primary" @click="handleSaveCategory" :loading="saveLoading">
              保存
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入分类编码" />
        </el-form-item>
        <el-form-item label="上级分类" prop="parentId">
          <el-cascader
            v-model="form.parentId"
            :options="categoryOptions"
            :props="{ value: 'id', label: 'name', children: 'children' }"
            placeholder="请选择上级分类"
            clearable
            style="width: 100%"
            :disabled="dialogType === 'edit' && form.level === 1"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="form.sort"
            :min="0"
            style="width: 100%"
            placeholder="请输入排序"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
        </el-form-item>
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
import { ref, reactive, onMounted, nextTick } from 'vue';
import {
  Plus,
  Refresh,
  EditPen,
  Delete
} from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { categoriesApi } from '@/api/categories';

const loading = ref(false);
const saveLoading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const dialogType = ref('add');
const dialogTitle = ref('新增分类');
const formRef = ref<FormInstance>();
const treeRef = ref();
const categoryTree = ref([]);
const categoryOptions = ref([]);
const expandedKeys = ref([]);
const checkedKeys = ref([]);
const selectedKeys = ref([]);
const currentCategory = ref<any>(null);

const defaultProps = {
  children: 'children',
  label: 'name',
};

const form = reactive({
  id: '',
  name: '',
  code: '',
  parentId: null,
  sort: 0,
  description: '',
  status: true,
  level: 1,
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'blur' }],
});

// 加载分类树
const loadCategoryTree = async () => {
  try {
    const response = await categoriesApi.getTree();
    categoryTree.value = response.data.tree;
    categoryOptions.value = response.data.tree;
  } catch (error) {
    console.error('加载分类树失败:', error);
    ElMessage.error('加载分类树失败');
  }
};

const handleRefreshTree = () => {
  loadCategoryTree();
};

const handleRefreshDetail = () => {
  if (currentCategory.value) {
    loadCategoryTree();
  }
};

const handleNodeClick = (data: any) => {
  currentCategory.value = { ...data };
};

const handleNodeContextMenu = (event: any, data: any) => {
  ElMessage.info('右键菜单功能开发中');
};

const handleAdd = () => {
  dialogType.value = 'add';
  dialogTitle.value = '新增分类';
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    parentId: null,
    sort: 0,
    description: '',
    status: true,
    level: 1,
  });
  dialogVisible.value = true;
};

const handleAddChild = (data: any) => {
  dialogType.value = 'add';
  dialogTitle.value = '新增子分类';
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    parentId: data.id,
    sort: 0,
    description: '',
    status: true,
    level: data.level + 1,
  });
  dialogVisible.value = true;
};

const handleEdit = (data: any) => {
  dialogType.value = 'edit';
  dialogTitle.value = '编辑分类';
  Object.assign(form, {
    id: data.id,
    name: data.name,
    code: data.code,
    parentId: data.parentId,
    sort: data.sort,
    description: data.description,
    status: data.status,
    level: data.level,
  });
  dialogVisible.value = true;
};

const handleDelete = async (data: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除${data.children && data.children.length > 0 ? '该分类及其所有子分类' : '该分类'}吗？删除后无法恢复。`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await categoriesApi.delete(data.id);
    ElMessage.success('删除成功');
    loadCategoryTree();
    currentCategory.value = null;
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const handleCancelEdit = () => {
  if (currentCategory.value) {
    // 重置为原始数据
    const originalData = findNode(categoryTree.value, currentCategory.value.id);
    if (originalData) {
      currentCategory.value = { ...originalData };
    }
  }
};

const findNode = (nodes: any[], id: string): any => {
  for (let node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const handleSaveCategory = async () => {
  if (!currentCategory.value) return;

  try {
    saveLoading.value = true;
    await categoriesApi.update(currentCategory.value.id, currentCategory.value);
    ElMessage.success('保存成功');
    loadCategoryTree();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败');
  } finally {
    saveLoading.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (dialogType.value === 'edit') {
      await categoriesApi.update(form.id, form);
      ElMessage.success('更新成功');
    } else {
      await categoriesApi.create(form);
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    loadCategoryTree();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitLoading.value = false;
  }
};

onMounted(() => {
  loadCategoryTree();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.tree-card {
  margin-bottom: 24px;
}

.detail-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.node-actions {
  visibility: hidden;
}

.custom-tree-node:hover .node-actions {
  visibility: visible;
}

.category-form {
  margin-top: 20px;
}

.form-actions {
  margin-top: 20px;
  text-align: right;
}
</style>
