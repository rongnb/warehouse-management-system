<template>
  <div class="inventory-container">
    <div class="page-header">
      <h2>库存管理</h2>
      <el-button type="primary" @click="handleAdjust">
        <el-icon><EditPen /></el-icon>
        库存调整
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

        <el-form-item label="仓库">
          <el-select
            v-model="searchForm.warehouse"
            placeholder="请选择仓库"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="warehouse in warehouses"
              :key="warehouse.id"
              :label="warehouse.name"
              :value="warehouse.id"
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
            <el-option label="正常" :value="1" />
            <el-option label="库存不足" :value="2" />
            <el-option label="库存过剩" :value="3" />
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

    <!-- 库存列表 -->
    <el-card class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="sku" label="SKU" width="140" />
        <el-table-column prop="productName" label="商品名称" min-width="180" />
        <el-table-column prop="warehouseName" label="仓库" width="120" />
        <el-table-column prop="quantity" label="当前库存" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStockStatusType(row)">
              {{ row.quantity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="minStock" label="最低库存" width="100" align="center" />
        <el-table-column prop="maxStock" label="最高库存" width="100" align="center" />
        <el-table-column prop="unitPrice" label="单价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ row.unitPrice?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="totalValue" label="库存价值" width="120" align="right">
          <template #default="{ row }">
            ¥{{ row.totalValue?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="primary" text size="small" @click="handleAdjust(row)">
              调整
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
          @size-change="handlePageChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 库存调整弹窗 -->
    <el-dialog
      v-model="adjustDialogVisible"
      :title="adjustForm.id ? '调整库存' : '新增库存记录'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="adjustFormRef"
        :model="adjustForm"
        :rules="adjustRules"
        label-width="100px"
      >
        <el-form-item label="商品" prop="productId">
          <el-select
            v-model="adjustForm.productId"
            placeholder="请选择商品"
            style="width: 100%"
            :disabled="!!adjustForm.id"
          >
            <el-option
              v-for="product in productOptions"
              :key="product.id"
              :label="product.name"
              :value="product.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库" prop="warehouseId">
          <el-select
            v-model="adjustForm.warehouseId"
            placeholder="请选择仓库"
            style="width: 100%"
            :disabled="!!adjustForm.id"
          >
            <el-option
              v-for="warehouse in warehouses"
              :key="warehouse.id"
              :label="warehouse.name"
              :value="warehouse.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="adjustForm.currentStock !== undefined" label="当前库存">
          <span class="current-stock-hint">
            {{ adjustForm.currentStock }} 件
            <el-tag v-if="adjustForm.currentStock === 0" type="danger" size="small" style="margin-left:6px">库存为零</el-tag>
          </span>
        </el-form-item>
        <el-form-item label="调整类型" prop="adjustType">
          <el-radio-group v-model="adjustForm.adjustType">
            <el-radio value="in">入库</el-radio>
            <el-radio value="out">出库</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整数量" prop="quantity">
          <el-input-number
            v-model="adjustForm.quantity"
            :min="1"
            :max="adjustForm.adjustType === 'out' && adjustForm.currentStock !== undefined ? adjustForm.currentStock : Infinity"
            style="width: 100%"
            placeholder="请输入调整数量"
          />
          <div v-if="adjustForm.adjustType === 'out' && adjustForm.currentStock !== undefined" class="stock-tip">
            最多可出库 {{ adjustForm.currentStock }} 件
          </div>
        </el-form-item>
        <el-form-item label="调整原因" prop="remark">
          <el-input
            v-model="adjustForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入调整原因"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdjustSubmit" :loading="adjustLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import {
  Search,
  Refresh,
  EditPen,
  Plus
} from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { inventoryApi } from '@/api/inventory';
import { productsApi } from '@/api/products';
import { warehousesApi } from '@/api/warehouses';

const loading = ref(false);
const adjustLoading = ref(false);
const adjustDialogVisible = ref(false);
const adjustFormRef = ref<FormInstance>();
const tableData = ref([]);
const productOptions = ref([]);
const warehouses = ref([]);

const searchForm = reactive({
  keyword: '',
  warehouse: '',
  status: '',
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const adjustForm = reactive({
  id: '',
  productId: '',
  warehouseId: '',
  quantity: 1,
  adjustType: 'in',
  remark: '',
  currentStock: undefined as number | undefined,
});

const adjustRules = reactive<FormRules>({
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  quantity: [
    { required: true, message: '请输入调整数量', trigger: 'blur' },
    {
      validator: (_rule: any, value: number, callback: (e?: Error) => void) => {
        if (adjustForm.adjustType === 'out' && adjustForm.currentStock !== undefined) {
          if (value > adjustForm.currentStock) {
            callback(new Error(`出库数量不能超过当前库存 ${adjustForm.currentStock} 件`));
            return;
          }
          if (adjustForm.currentStock === 0) {
            callback(new Error('当前库存为零，无法出库'));
            return;
          }
        }
        callback();
      },
      trigger: 'change',
    },
  ],
  adjustType: [{ required: true, message: '请选择调整类型', trigger: 'change' }],
  remark: [{ required: true, message: '请输入调整原因', trigger: 'blur' }],
});

// 加载库存列表
const loadInventory = async () => {
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm,
    };

    const response = await inventoryApi.getList(params);
    tableData.value = response.data.inventory;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    console.error('加载库存列表失败:', error);
    ElMessage.error('加载库存列表失败');
  } finally {
    loading.value = false;
  }
};

// 加载选项数据
const loadOptions = async () => {
  try {
    const [productsRes, warehousesRes] = await Promise.all([
      productsApi.getOptions(),
      warehousesApi.getOptions(),
    ]);

    productOptions.value = productsRes.data.products;
    warehouses.value = warehousesRes.data.warehouses;
  } catch (error) {
    console.error('加载选项失败:', error);
  }
};

const getStockStatusType = (row: any) => {
  if (row.quantity <= row.minStock) {
    return 'danger';
  } else if (row.quantity >= row.maxStock) {
    return 'warning';
  } else {
    return 'success';
  }
};

const handleSearch = () => {
  pagination.page = 1;
  loadInventory();
};

const handlePageChange = () => {
  loadInventory();
};

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    warehouse: '',
    status: '',
  });
  handleSearch();
};

const handleView = (row: any) => {
  ElMessage.info('查看功能开发中');
};

const handleAdjust = (row?: any) => {
  adjustDialogVisible.value = true;
  if (row) {
    Object.assign(adjustForm, {
      id: row.id,
      productId: row.productId,
      warehouseId: row.warehouseId,
      quantity: 1,
      adjustType: 'in',
      remark: '',
      currentStock: row.quantity,
    });
  } else {
    Object.assign(adjustForm, {
      id: '',
      productId: '',
      warehouseId: '',
      quantity: 1,
      adjustType: 'in',
      remark: '',
      currentStock: undefined,
    });
  }
};

const handleAdjustSubmit = async () => {
  if (!adjustFormRef.value) return;

  try {
    await adjustFormRef.value.validate();
    adjustLoading.value = true;

    // 始终通过商品+仓库进行调整，确保用户切换仓库后操作的是目标仓库的库存，
    // 而不是最初选中行的库存（同时支持新增仓库库存记录）。
    await inventoryApi.adjustByProductWarehouse({
      product: adjustForm.productId,
      warehouse: adjustForm.warehouseId,
      quantity: adjustForm.adjustType === 'in' ? adjustForm.quantity : -adjustForm.quantity,
      remark: adjustForm.remark,
    });
    ElMessage.success('调整成功');

    adjustDialogVisible.value = false;
    loadInventory();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    adjustLoading.value = false;
  }
};

watch(() => adjustForm.adjustType, () => {
  adjustFormRef.value?.validateField('quantity');
});

onMounted(() => {
  loadOptions();
  loadInventory();
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

.current-stock-hint {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.stock-tip {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 4px;
}
</style>
