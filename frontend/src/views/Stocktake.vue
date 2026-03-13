<template>
  <div class="stocktake-container">
    <div class="header">
      <h2>库存盘点</h2>
      <el-button type="primary" @click="handleCreate" v-permission="['admin', 'manager']">
        <el-icon><Plus /></el-icon>
        新建盘点
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="盘点单号">
          <el-input v-model="searchForm.keyword" placeholder="请输入盘点单号/标题" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 150px">
            <el-option label="草稿" value="draft" />
            <el-option label="核实中" value="confirming" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="searchForm.warehouse" placeholder="请选择仓库" clearable style="width: 150px">
            <el-option 
              v-for="warehouse in warehouseList" 
              :key="warehouse._id" 
              :label="warehouse.name" 
              :value="warehouse._id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
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
        </el-form-item>
      </el-form>
    </div>

    <!-- 列表 -->
    <div class="table-container">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="stocktakeNo" label="盘点单号" width="180" />
        <el-table-column prop="title" label="盘点标题" min-width="200" />
        <el-table-column prop="warehouseName" label="仓库" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalProfitQuantity" label="盘盈数量" width="100" align="right" />
        <el-table-column prop="totalProfitAmount" label="盘盈金额" width="120" align="right">
          <template #default="scope">
            ¥{{ scope.row.totalProfitAmount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalLossQuantity" label="盘亏数量" width="100" align="right" />
        <el-table-column prop="totalLossAmount" label="盘亏金额" width="120" align="right">
          <template #default="scope">
            ¥{{ scope.row.totalLossAmount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdBy.realName" label="创建人" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleView(scope.row)">
              查看
            </el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="handleEdit(scope.row)"
              v-if="scope.row.status === 'draft'"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleConfirm(scope.row)"
              v-if="scope.row.status === 'confirming'"
            >
              核实
            </el-button>
            <el-button 
              size="small" 
              type="warning" 
              @click="handleExport(scope.row)"
              v-if="scope.row.status === 'completed'"
            >
              导出
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleCancel(scope.row)"
              v-if="scope.row.status !== 'completed'"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pageParams.page"
          v-model:page-size="pageParams.limit"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      width="90%"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="盘点标题" prop="title" required>
              <el-input v-model="form.title" placeholder="请输入盘点标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="盘点仓库" prop="warehouse" required>
              <el-select 
                v-model="form.warehouse" 
                placeholder="请选择仓库" 
                style="width: 100%"
                :disabled="form._id"
              >
                <el-option 
                  v-for="warehouse in warehouseList" 
                  :key="warehouse._id" 
                  :label="warehouse.name" 
                  :value="warehouse._id" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input type="textarea" v-model="form.remark" placeholder="请输入备注" :rows="3" />
        </el-form-item>

        <el-form-item label="盘点明细" class="mt-4">
          <el-table :data="form.items" border style="width: 100%" max-height="400">
            <el-table-column prop="sku" label="SKU" width="120" />
            <el-table-column prop="productName" label="商品名称" min-width="200" />
            <el-table-column prop="spec" label="规格" width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="systemQuantity" label="系统库存" width="100" align="right" />
            <el-table-column prop="actualQuantity" label="实际库存" width="120" align="right">
              <template #default="scope">
                <el-input-number 
                  v-model="scope.row.actualQuantity" 
                  :min="0" 
                  @change="calculateDifference(scope.row)"
                  :disabled="form.status !== 'draft'"
                  style="width: 100px"
                />
              </template>
            </el-table-column>
            <el-table-column prop="difference" label="差异" width="100" align="right">
              <template #default="scope">
                <span :class="{ 'text-green': scope.row.difference > 0, 'text-red': scope.row.difference < 0 }">
                  {{ scope.row.difference > 0 ? '+' : '' }}{{ scope.row.difference }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="差异类型" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.differenceType === 'profit' ? 'success' : scope.row.differenceType === 'loss' ? 'danger' : 'info'">
                  {{ scope.row.differenceType === 'profit' ? '盘盈' : scope.row.differenceType === 'loss' ? '盘亏' : '无差异' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="unitPrice" label="单价" width="100" align="right">
              <template #default="scope">
                ¥{{ scope.row.unitPrice.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="差异金额" width="120" align="right">
              <template #default="scope">
                <span :class="{ 'text-green': scope.row.totalAmount > 0, 'text-red': scope.row.totalAmount < 0 }">
                  ¥{{ scope.row.totalAmount.toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150">
              <template #default="scope">
                <el-input 
                  v-model="scope.row.remark" 
                  placeholder="请输入备注" 
                  :disabled="form.status !== 'draft'"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>

        <!-- 统计信息 -->
        <div class="summary mt-4">
          <el-descriptions :column="4" border>
            <el-descriptions-item label="总盘盈数量">
              <span class="text-green">{{ form.totalProfitQuantity || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="总盘盈金额">
              <span class="text-green">¥{{ (form.totalProfitAmount || 0).toFixed(2) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="总盘亏数量">
              <span class="text-red">{{ form.totalLossQuantity || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="总盘亏金额">
              <span class="text-red">¥{{ (form.totalLossAmount || 0).toFixed(2) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave" v-if="form.status === 'draft'">
            保存
          </el-button>
          <el-button type="success" @click="handleSubmit" v-if="form.status === 'draft' && form._id">
            提交审核
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 核实弹窗 -->
    <el-dialog v-model="confirmDialogVisible" title="核实盘点单" width="500px">
      <el-form :model="confirmForm" label-width="100px">
        <el-form-item label="核实意见">
          <el-input type="textarea" v-model="confirmForm.remark" placeholder="请输入核实意见" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSubmit">确认核实</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 取消弹窗 -->
    <el-dialog v-model="cancelDialogVisible" title="取消盘点单" width="500px">
      <el-form :model="cancelForm" label-width="100px">
        <el-form-item label="取消原因" required>
          <el-input type="textarea" v-model="cancelForm.reason" placeholder="请输入取消原因" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="cancelSubmit">确认取消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import { stocktakeApi } from '@/api/stocktake';
import { warehouseApi } from '@/api/warehouse';
// import * as XLSX from 'xlsx'; // 如需导出功能请先安装xlsx依赖：npm install xlsx

const loading = ref(false);
const tableData = ref([]);
const warehouseList = ref([]);
const total = ref(0);
const dateRange = ref([]);

const searchForm = reactive({
  keyword: '',
  status: '',
  warehouse: '',
});

const pageParams = reactive({
  page: 1,
  limit: 10,
});

const dialogVisible = ref(false);
const dialogTitle = ref('新建盘点');
const form = reactive({
  _id: '',
  title: '',
  warehouse: '',
  remark: '',
  status: 'draft',
  items: [],
  totalProfitQuantity: 0,
  totalProfitAmount: 0,
  totalLossQuantity: 0,
  totalLossAmount: 0,
});

const confirmDialogVisible = ref(false);
const confirmForm = reactive({
  id: '',
  remark: '',
});

const cancelDialogVisible = ref(false);
const cancelForm = reactive({
  id: '',
  reason: '',
});

// 获取仓库列表
const getWarehouseList = async () => {
  try {
    const res = await warehouseApi.getList({ page: 1, limit: 1000 });
    warehouseList.value = res.data.list;
  } catch (error) {
    ElMessage.error('获取仓库列表失败');
  }
};

// 获取列表
const getList = async () => {
  loading.value = true;
  try {
    const params = {
      ...pageParams,
      ...searchForm,
      startDate: dateRange.value?.[0] ? dateRange.value[0] : undefined,
      endDate: dateRange.value?.[1] ? dateRange.value[1] : undefined,
    };
    const res = await stocktakeApi.getList(params);
    tableData.value = res.data.list;
    total.value = res.data.total;
  } catch (error) {
    ElMessage.error('获取盘点列表失败');
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  pageParams.page = 1;
  getList();
};

// 重置
const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    warehouse: '',
  });
  dateRange.value = [];
  pageParams.page = 1;
  getList();
};

// 分页变化
const handleSizeChange = (size: number) => {
  pageParams.limit = size;
  getList();
};

const handlePageChange = (page: number) => {
  pageParams.page = page;
  getList();
};

// 新建
const handleCreate = () => {
  dialogTitle.value = '新建盘点';
  Object.assign(form, {
    _id: '',
    title: '',
    warehouse: '',
    remark: '',
    status: 'draft',
    items: [],
    totalProfitQuantity: 0,
    totalProfitAmount: 0,
    totalLossQuantity: 0,
    totalLossAmount: 0,
  });
  dialogVisible.value = true;
};

// 编辑
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑盘点';
  Object.assign(form, { ...row });
  dialogVisible.value = true;
};

// 查看
const handleView = (row: any) => {
  dialogTitle.value = '查看盘点';
  Object.assign(form, { ...row });
  dialogVisible.value = true;
};

// 计算差异
const calculateDifference = (item: any) => {
  item.difference = item.actualQuantity - item.systemQuantity;
  
  if (item.difference > 0) {
    item.differenceType = 'profit';
  } else if (item.difference < 0) {
    item.differenceType = 'loss';
  } else {
    item.differenceType = 'none';
  }
  
  item.totalAmount = item.difference * item.unitPrice;
  
  // 重新计算总计
  calculateTotal();
};

// 计算总计
const calculateTotal = () => {
  form.totalProfitQuantity = 0;
  form.totalProfitAmount = 0;
  form.totalLossQuantity = 0;
  form.totalLossAmount = 0;
  
  form.items.forEach(item => {
    if (item.differenceType === 'profit') {
      form.totalProfitQuantity += item.difference;
      form.totalProfitAmount += item.totalAmount;
    } else if (item.differenceType === 'loss') {
      form.totalLossQuantity += Math.abs(item.difference);
      form.totalLossAmount += Math.abs(item.totalAmount);
    }
  });
};

// 保存
const handleSave = async () => {
  if (!form.title || !form.warehouse) {
    ElMessage.error('标题和仓库不能为空');
    return;
  }
  
  try {
    if (form._id) {
      // 更新
      await stocktakeApi.update(form._id, {
        items: form.items,
        remark: form.remark,
      });
      ElMessage.success('更新成功');
    } else {
      // 创建
      const res = await stocktakeApi.create({
        title: form.title,
        warehouse: form.warehouse,
        remark: form.remark,
      });
      form._id = res.data._id;
      form.items = res.data.items;
      calculateTotal();
      ElMessage.success('创建成功');
    }
    getList();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '保存失败');
  }
};

// 提交审核
const handleSubmit = async () => {
  if (!form._id) {
    ElMessage.error('请先保存盘点单');
    return;
  }
  
  try {
    await ElMessageBox.confirm('确定要提交该盘点单吗？提交后将进入核实流程，无法再编辑。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    await stocktakeApi.submit(form._id);
    ElMessage.success('提交成功，等待核实');
    dialogVisible.value = false;
    getList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('提交失败');
    }
  }
};

// 核实
const handleConfirm = (row: any) => {
  confirmForm.id = row._id;
  confirmForm.remark = '';
  confirmDialogVisible.value = true;
};

// 提交核实
const confirmSubmit = async () => {
  try {
    const res = await stocktakeApi.confirm(confirmForm.id, {
      remark: confirmForm.remark,
    });
    ElMessage.success(res.data.message);
    confirmDialogVisible.value = false;
    getList();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '核实失败');
  }
};

// 取消
const handleCancel = (row: any) => {
  cancelForm.id = row._id;
  cancelForm.reason = '';
  cancelDialogVisible.value = true;
};

// 提交取消
const cancelSubmit = async () => {
  if (!cancelForm.reason) {
    ElMessage.error('取消原因不能为空');
    return;
  }
  
  try {
    await ElMessageBox.confirm('确定要取消该盘点单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    await stocktakeApi.cancel(cancelForm.id, {
      reason: cancelForm.reason,
    });
    ElMessage.success('取消成功');
    cancelDialogVisible.value = false;
    getList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败');
    }
  }
};

// 导出
const handleExport = async (row: any) => {
  try {
    const res = await stocktakeApi.export(row._id);
    const data = res.data;
    
    // 构造Excel数据（需安装xlsx依赖后启用）
    // const headers = [
    //   'SKU', '商品名称', '规格', '单位', '系统库存', '实际库存', '差异', '差异类型', '单价', '差异金额', '备注'
    // ];
    
    // const rows = data.items.map((item: any) => [
    //   item.sku,
    //   item.productName,
    //   item.spec,
    //   item.unit,
    //   item.systemQuantity,
    //   item.actualQuantity,
    //   item.difference,
    //   item.differenceType,
    //   item.unitPrice,
    //   item.totalAmount,
    //   item.remark,
    // ]);
    
    // // 汇总信息
    // const summary = [
    //   [],
    //   ['盘点单号:', data.stocktakeNo],
    //   ['盘点标题:', data.title],
    //   ['仓库:', data.warehouseName],
    //   ['状态:', getStatusText(data.status)],
    //   ['开始时间:', formatDate(data.startTime)],
    //   ['结束时间:', formatDate(data.endTime)],
    //   ['总盘盈数量:', data.totalProfitQuantity],
    //   ['总盘盈金额:', `¥${data.totalProfitAmount.toFixed(2)}`],
    //   ['总盘亏数量:', data.totalLossQuantity],
    //   ['总盘亏金额:', `¥${data.totalLossAmount.toFixed(2)}`],
    //   ['第一核实人:', data.firstConfirmedBy || ''],
    //   ['第一核实时间:', formatDate(data.firstConfirmedAt)],
    //   ['第二核实人:', data.secondConfirmedBy || ''],
    //   ['第二核实时间:', formatDate(data.secondConfirmedAt)],
    //   ['创建人:', data.createdBy],
    //   ['创建时间:', formatDate(data.createdAt)],
    //   ['备注:', data.remark],
    //   [],
    //   headers,
    //   ...rows,
    // ];
    
    // const worksheet = XLSX.utils.aoa_to_sheet(summary);
    // const workbook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(workbook, worksheet, '盘库报表');
    
    // // 下载
    // XLSX.writeFile(workbook, `${data.stocktakeNo}_${data.title}.xlsx`);
    ElMessage.success('导出功能已触发，请先安装xlsx依赖：npm install xlsx');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    confirming: 'warning',
    completed: 'success',
    cancelled: 'danger',
  };
  return map[status] || 'info';
};

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    confirming: '核实中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status;
};

// 格式化日期
const formatDate = (date: any) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  getWarehouseList();
  getList();
});
</script>

<style scoped>
.stocktake-container {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 20px;
  background: #fff;
  padding: 15px;
  border-radius: 4px;
}

.table-container {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.summary {
  margin-top: 20px;
}

.text-green {
  color: #67c23a;
}

.text-red {
  color: #f56c6c;
}
</style>