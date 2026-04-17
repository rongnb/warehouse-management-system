<template>
  <div class="transactions-container">
    <div class="page-header">
      <h2>出入库管理</h2>
      <el-button type="primary" @click="handleCreateInbound">
        <el-icon><Bottom /></el-icon>
        入库
      </el-button>
      <el-button type="primary" @click="handleCreateOutbound">
        <el-icon><Top /></el-icon>
        出库
      </el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline label-width="80px">
        <el-form-item label="交易号">
          <el-input
            v-model="searchForm.transactionNo"
            placeholder="请输入交易号"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="商品">
          <el-input
            v-model="searchForm.productName"
            placeholder="商品名称/SKU"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="类型">
          <el-select
            v-model="searchForm.type"
            placeholder="请选择类型"
            clearable
            style="width: 120px"
          >
            <el-option label="入库" value="in" />
            <el-option label="出库" value="out" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="待审核" value="pending" />
            <el-option label="已审核" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>

        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 300px"
          />
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
          <el-button type="success" @click="handleExport" :loading="exportLoading">
            <el-icon><Download /></el-icon>
            导出Excel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 交易记录列表 -->
    <el-card class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="transactionNo" label="交易号" width="180" />
        <el-table-column prop="productName" label="商品名称" min-width="180" />
        <el-table-column prop="sku" label="SKU" width="140" />
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'in' ? 'success' : 'danger'">
              {{ row.type === 'in' ? '入库' : '出库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100" align="center">
          <template #default="{ row }">
            {{ row.type === 'in' ? '+' : '-' }}{{ row.quantity }}
          </template>
        </el-table-column>
        <el-table-column prop="unitPrice" label="单价" width="100" align="right">
          <template #default="{ row }">
            ¥{{ row.unitPrice?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
          <template #default="{ row }">
            ¥{{ row.totalAmount?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="warehouseName" label="仓库" width="120" />
        <!-- 领用信息列（仅出库显示） -->
        <el-table-column prop="consumptionUnit" label="领用单位" width="120" v-if="searchForm.type === 'out'" />
        <el-table-column prop="consumptionApprover" label="审批人" width="100" v-if="searchForm.type === 'out'" />
        <el-table-column prop="consumptionHandler" label="经办人" width="100" v-if="searchForm.type === 'out'" />
        <el-table-column prop="consumptionDate" label="领用日期" width="120" v-if="searchForm.type === 'out'" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="danger" text size="small" @click="handleCancel(row)" v-if="['pending', 'completed'].includes(row.status)">
              取消
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
      :title="isEdit ? '编辑交易' : (isInbound ? '入库' : '出库')"
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
            <el-form-item label="商品" prop="productId">
              <el-select
                v-model="form.productId"
                placeholder="请选择商品"
                style="width: 100%"
              >
                <el-option
                  v-for="product in products"
                  :key="product.id"
                  :label="product.name"
                  :value="product.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库" prop="warehouseId">
              <el-select
                v-model="form.warehouseId"
                placeholder="请选择仓库"
                style="width: 100%"
              >
                <el-option
                  v-for="warehouse in warehouses"
                  :key="warehouse.id"
                  :label="warehouse.name"
                  :value="warehouse.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="图像识别">
              <el-button type="primary" @click="showImageRecognition = true">
                <el-icon><Camera /></el-icon>
                拍照识别商品
              </el-button>
              <el-divider content-position="center">或</el-divider>
              <el-button type="success" @click="showImageRecognition = true">
                <el-icon><Upload /></el-icon>
                从相册选择
              </el-button>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数量" prop="quantity">
              <el-input-number
                v-model="form.quantity"
                :min="1"
                style="width: 100%"
                placeholder="请输入数量"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价" prop="unitPrice">
              <el-input-number
                v-model="form.unitPrice"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入单价"
              />
            </el-form-item>
          </el-col>
          <!-- 领用相关字段（仅出库显示） -->
          <template v-if="!isInbound">
            <el-col :span="12">
              <el-form-item label="领用单位" prop="consumptionUnit">
                <el-input
                  v-model="form.consumptionUnit"
                  placeholder="请输入领用单位"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="领用时间" prop="consumptionDate">
                <el-date-picker
                  v-model="form.consumptionDate"
                  type="date"
                  placeholder="请选择领用日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单位审批人" prop="consumptionApprover">
                <el-input
                  v-model="form.consumptionApprover"
                  placeholder="请输入单位审批人"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="领用经办人" prop="consumptionHandler">
                <el-input
                  v-model="form.consumptionHandler"
                  placeholder="请输入领用经办人"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </template>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注"
              />
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


    <!-- 取消弹窗 -->
    <el-dialog
      v-model="cancelDialogVisible"
      title="取消交易"
      width="500px"
    >
      <el-form :model="cancelForm" label-width="100px">
        <el-form-item label="取消原因">
          <el-input
            v-model="cancelForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入取消原因"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cancelDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleCancelSubmit" :loading="cancelLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情查看弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="交易详情"
      width="700px"
      destroy-on-close
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="交易号">{{ detail.transactionNo }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="detail.type === 'in' ? 'success' : 'danger'">
            {{ detail.type === 'in' ? '入库' : '出库' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="商品名称">{{ detail.productName }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ detail.sku }}</el-descriptions-item>
        <el-descriptions-item label="规格">{{ detail.spec }}</el-descriptions-item>
        <el-descriptions-item label="单位">{{ detail.unit }}</el-descriptions-item>
        <el-descriptions-item label="仓库">{{ detail.warehouseName }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ detail.quantity }}</el-descriptions-item>
        <el-descriptions-item label="单价">¥{{ detail.unitPrice?.toFixed(2) || '0.00' }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ detail.totalAmount?.toFixed(2) || '0.00' }}</el-descriptions-item>

        <!-- 领用信息（仅出库显示） -->
        <template v-if="detail.type === 'out' && detail.consumptionUnit">
          <el-descriptions-item label="领用单位">{{ detail.consumptionUnit }}</el-descriptions-item>
          <el-descriptions-item label="领用日期">{{ formatDate(detail.consumptionDate) }}</el-descriptions-item>
          <el-descriptions-item label="单位审批人">{{ detail.consumptionApprover }}</el-descriptions-item>
          <el-descriptions-item label="领用经办人">{{ detail.consumptionHandler }}</el-descriptions-item>
        </template>

        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)">
            {{ getStatusText(detail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ detail.createdBy }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.auditBy" label="审核人">{{ detail.auditBy?.realName || detail.auditBy }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.auditTime" label="审核时间">{{ formatDate(detail.auditTime) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.auditRemark" label="审核备注" :span="2">{{ detail.auditRemark }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.remark" label="备注" :span="2">{{ detail.remark }}</el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEdit(detail)" v-if="!isCompletedOrCancelled(detail.status)">
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>
      </template>
    </el-dialog>

    <!-- 图像识别弹窗 -->
    <el-dialog
      v-model="showImageRecognition"
      :title="isInbound ? '拍照识别商品' : '拍照识别商品'"
      width="600px"
      destroy-on-close
      class="image-recognition-dialog"
    >
      <ImageRecognitionComponent
        :products="products"
        :mode="isInbound ? 'inbound' : 'outbound'"
        @result="handleImageRecognitionResult"
        @cancel="showImageRecognition = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  Bottom,
  Top,
  Search,
  Refresh,
  View,
  Edit,
  Delete,
  Camera,
  Upload,
  Download
} from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { transactionsApi } from '@/api/transactions';
import { productsApi } from '@/api/products';
import { warehousesApi } from '@/api/warehouses';
import ImageRecognitionComponent from '@/components/ImageRecognitionComponent.vue';
import type { RecognitionResult } from '@/utils/imageRecognition';
import { initializeImageRecognizer } from '@/utils/imageRecognition';
import ExcelJS from 'exceljs';

const loading = ref(false);
const submitLoading = ref(false);
const cancelLoading = ref(false);
const exportLoading = ref(false);
const dialogVisible = ref(false);
const cancelDialogVisible = ref(false);
const showImageRecognition = ref(false);
const isEdit = ref(false);
const isInbound = ref(true);
const formRef = ref<FormInstance>();
const tableData = ref([]);
const products = ref([]);
const warehouses = ref([]);
const dateRange = ref([]);
const detailDialogVisible = ref(false);
const detail = reactive<any>({
  transactionNo: '',
  type: '',
  productName: '',
  sku: '',
  spec: '',
  unit: '',
  warehouseName: '',
  quantity: 0,
  unitPrice: 0,
  totalAmount: 0,
  consumptionUnit: '',
  consumptionApprover: '',
  consumptionHandler: '',
  consumptionDate: null,
  status: '',
  createdBy: '',
  createdAt: null,
  auditBy: '',
  auditTime: null,
  auditRemark: '',
  remark: '',
});

const searchForm = reactive({
  transactionNo: '',
  productName: '',
  type: '',
  status: '',
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
});

const form = reactive({
  id: '',
  productId: '',
  warehouseId: '',
  quantity: 0,
  unitPrice: 0,
  remark: '',
  type: 'in',
  // 领用相关字段
  consumptionUnit: '',
  consumptionApprover: '',
  consumptionHandler: '',
  consumptionDate: null,
});

const cancelForm = reactive({
  id: '',
  reason: '',
});

const rules = reactive<FormRules>({
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
});

// 加载交易记录列表
const loadTransactions = async () => {
  try {
    loading.value = true;
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    };

    const response = await transactionsApi.getList(params);
    tableData.value = response.data.transactions;
    pagination.total = response.data.pagination.total;
  } catch (error) {
    console.error('加载交易记录失败:', error);
    ElMessage.error('加载交易记录失败');
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

    products.value = productsRes.data.products;
    warehouses.value = warehousesRes.data.warehouses;
  } catch (error) {
    console.error('加载选项失败:', error);
  }
};

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    cancelled: 'info',
  };
  return typeMap[status] || 'info';
};

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消',
  };
  return textMap[status] || status;
};

// 格式化日期
const formatDate = (date: any) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 判断是否已完成或已取消（不可编辑）
const isCompletedOrCancelled = (status: string) => {
  return ['completed', 'cancelled'].includes(status);
};

const handleSearch = () => {
  pagination.page = 1;
  loadTransactions();
};

const handleReset = () => {
  Object.assign(searchForm, {
    transactionNo: '',
    productName: '',
    type: '',
    status: '',
  });
  dateRange.value = [];
  handleSearch();
};

const handleCreateInbound = () => {
  isEdit.value = false;
  isInbound.value = true;
  Object.assign(form, {
    id: '',
    productId: '',
    warehouseId: '',
    quantity: 0,
    unitPrice: 0,
    remark: '',
    type: 'in',
    consumptionUnit: '',
    consumptionApprover: '',
    consumptionHandler: '',
    consumptionDate: null,
  });
  dialogVisible.value = true;
};

const handleCreateOutbound = () => {
  isEdit.value = false;
  isInbound.value = false;
  Object.assign(form, {
    id: '',
    productId: '',
    warehouseId: '',
    quantity: 0,
    unitPrice: 0,
    remark: '',
    type: 'out',
    consumptionUnit: '',
    consumptionApprover: '',
    consumptionHandler: '',
    consumptionDate: new Date(),
  });
  dialogVisible.value = true;
};

const handleView = async (row: any) => {
  try {
    loading.value = true;
    const res = await transactionsApi.getDetail(row.id);
    const data = res.data.transaction;

    // 填充详情数据
    Object.assign(detail, {
      id: data._id || data.id,
      transactionNo: data.transactionNo,
      type: data.type,
      productName: data.product?.name || data.productName,
      sku: data.product?.sku || data.sku,
      spec: data.product?.specification || data.spec,
      unit: data.product?.unit || data.unit,
      warehouseName: data.warehouse?.name || data.warehouseName,
      quantity: data.quantity,
      unitPrice: data.unitPrice || data.price,
      totalAmount: data.totalAmount,
      consumptionUnit: data.consumptionUnit || '',
      consumptionApprover: data.consumptionApprover || '',
      consumptionHandler: data.consumptionHandler || '',
      consumptionDate: data.consumptionDate,
      status: data.status,
      createdBy: data.createdBy?.realName || data.createdBy,
      createdAt: data.createdAt,
      auditBy: data.auditBy,
      auditTime: data.auditTime,
      auditRemark: data.auditRemark || '',
      remark: data.remark || '',
    });

    detailDialogVisible.value = true;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载详情失败');
  } finally {
    loading.value = false;
  }
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  isInbound.value = row.type === 'in';
  Object.assign(form, {
    id: row.id,
    productId: row.productId,
    warehouseId: row.warehouseId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    remark: row.remark,
    type: row.type,
    consumptionUnit: row.consumptionUnit || '',
    consumptionApprover: row.consumptionApprover || '',
    consumptionHandler: row.consumptionHandler || '',
    consumptionDate: row.consumptionDate || null,
  });
  dialogVisible.value = true;
};

const handleCancel = (row: any) => {
  cancelForm.id = row.id;
  cancelForm.reason = '';
  cancelDialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isEdit.value) {
      await transactionsApi.update(form.id, form);
      ElMessage.success('更新成功');
    } else {
      if (isInbound.value) {
        await transactionsApi.createInbound(form);
      } else {
        await transactionsApi.createOutbound(form);
      }
      ElMessage.success('创建成功');
    }

    dialogVisible.value = false;
    loadTransactions();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitLoading.value = false;
  }
};

const handleCancelSubmit = async () => {
  try {
    cancelLoading.value = true;
    await transactionsApi.cancel(cancelForm.id, { reason: cancelForm.reason });
    ElMessage.success('取消成功');
    cancelDialogVisible.value = false;
    loadTransactions();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '取消失败');
  } finally {
    cancelLoading.value = false;
  }
};

// 导出Excel
const handleExport = async () => {
  try {
    exportLoading.value = true;

    // 校验是否选择了日期范围，避免导出过多数据
    if (!dateRange.value || dateRange.value.length !== 2 || !dateRange.value[0] || !dateRange.value[1]) {
      ElMessage.warning('请先选择日期范围后再导出');
      exportLoading.value = false;
      return;
    }

    // 获取当前搜索条件下的所有数据导出
    const params = {
      transactionNo: searchForm.transactionNo,
      productName: searchForm.productName,
      type: searchForm.type,
      status: searchForm.status,
      startDate: dateRange.value?.[0] || null,
      endDate: dateRange.value?.[1] || null,
    };

    const res = await transactionsApi.export(params);
    const data = res.data;

    if (!Array.isArray(data) || data.length === 0) {
      ElMessage.warning('没有数据可导出');
      return;
    }

    // 构造Excel数据
    const headers = [
      '交易号', '类型', '商品名称', 'SKU', '规格', '单位', '仓库',
      '数量', '单价', '总金额', '领用单位', '领用日期', '单位审批人',
      '领用经办人', '状态', '创建人', '创建时间', '备注'
    ];

    const rows = data.map((item: any) => [
      item.transactionNo,
      item.type === 'in' ? '入库' : '出库',
      item.productName,
      item.sku,
      item.spec || '-',
      item.unit || '-',
      item.warehouseName,
      item.quantity,
      item.unitPrice || 0,
      item.totalAmount || 0,
      item.consumptionUnit || '-',
      item.consumptionDate ? new Date(item.consumptionDate).toLocaleDateString() : '-',
      item.consumptionApprover || '-',
      item.consumptionHandler || '-',
      getStatusText(item.status),
      item.createdBy,
      item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
      item.remark || '-',
    ]);

    const excelData = [headers, ...rows];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('出入库记录');

    // 添加所有行（表头 + 数据）
    excelData.forEach((row: any[]) => {
      worksheet.addRow(row);
    });

    // 设置列宽（ExcelJS使用width属性，约等于xlsx的wch）
    const colWidths = [20, 6, 20, 15, 15, 8, 15, 10, 12, 14, 15, 12, 12, 12, 10, 10, 20, 25];
    colWidths.forEach((width, index) => {
      const col = worksheet.getColumn(index + 1);
      col.width = width;
    });

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `出入库记录_${timestamp}.xlsx`;

    // 下载
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功！');
  } catch (error: any) {
    console.error('导出失败:', error);
    let errorMessage = '导出失败';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    ElMessage.error(errorMessage);
  } finally {
    exportLoading.value = false;
  }
};

onMounted(() => {
  loadOptions();
  loadTransactions();
  // 初始化图像识别器
  initializeImageRecognizer().catch((error) => {
    console.error('图像识别器初始化失败:', error);
    ElMessage.warning('图像识别功能可能不可用');
  });
});

// 处理图像识别结果
const handleImageRecognitionResult = (result: RecognitionResult, createNew: boolean = false) => {
  console.log('图像识别结果:', result);
  showImageRecognition.value = false;

  // 尝试根据识别结果自动匹配商品
  const matchedProduct = products.value.find((product) =>
    product.name.toLowerCase().includes(result.modelName.toLowerCase()) ||
    product.sku.toLowerCase().includes(result.modelName.toLowerCase()) ||
    product.manufacturer?.toLowerCase().includes(result.manufacturer.toLowerCase())
  );

  if (matchedProduct) {
    form.productId = matchedProduct.id;
    ElMessage.success(`已匹配到商品: ${matchedProduct.name}`);
  } else if (createNew) {
    // 创建新商品
    createNewProduct(result);
  } else {
    ElMessage.info(`未找到匹配的商品，识别结果为: ${result.manufacturer} ${result.modelName}`);
  }

  // 将识别结果添加到备注中，作为参考
  let remarkText = `识别结果: ${result.manufacturer} ${result.modelName} (置信度: ${Math.round(result.confidence * 100)}%)`;

  // 添加OCR识别的文字
  if (result.ocrText) {
    remarkText += `\n识别文字: ${result.ocrText}`;
  }

  if (form.remark) {
    form.remark += `\n${remarkText}`;
  } else {
    form.remark = remarkText;
  }
};

// 创建新商品
const createNewProduct = async (result: RecognitionResult) => {
  try {
    const newProductData = {
      name: result.modelName || '未命名商品',
      modelName: result.modelName,
      manufacturer: result.manufacturer,
      sku: generateSKU(result.modelName),
      specification: '',
      unit: '个',
      price: 0,
      costPrice: 0,
      minStock: 0,
      maxStock: 9999,
      status: true
    };

    const response = await productsApi.create(newProductData);

    if (response.data && response.data.id) {
      // 刷新商品列表
      await loadOptions();

      // 设置新创建的商品
      form.productId = response.data.id;
      ElMessage.success(`已创建新商品: ${newProductData.name}`);
    } else {
      throw new Error('商品创建失败');
    }
  } catch (error: any) {
    console.error('创建新商品失败:', error);
    ElMessage.error(`创建新商品失败: ${error.response?.data?.message || error.message}`);
  }
};

// 生成SKU
const generateSKU = (modelName: string): string => {
  const prefix = modelName.slice(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}${timestamp}`;
};

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
