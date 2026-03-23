<template>
  <div class="image-recognition-container">
    <!-- 拍照界面 -->
    <div v-if="step === 'camera'" class="camera-section">
      <el-card class="camera-card">
        <template #header>
          <h3>拍照识别</h3>
        </template>
        <CameraComponent
          @photo-taken="handlePhotoTaken"
          @cancel="handleCancel"
        />
        <div class="manual-entry">
          <el-divider content-position="center">或</el-divider>
          <el-button type="primary" @click="step = 'manual'">
            <el-icon><EditPen /></el-icon>
            手动输入
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 识别过程 -->
    <div v-if="step === 'recognizing'" class="recognizing-section">
      <el-card class="recognizing-card">
        <template #header>
          <h3>正在识别...</h3>
        </template>
        <div class="recognition-content">
          <el-icon class="recognition-icon"><Loading /></el-icon>
          <div class="recognition-text">正在分析图片...</div>
          <div class="recognition-progress">
            <el-progress :percentage="recognitionProgress" status="success" />
          </div>
          <div class="recognition-actions">
            <el-button @click="step = 'camera'">
              <el-icon><Refresh /></el-icon>
              重拍
            </el-button>
            <el-button type="primary" @click="step = 'manual'">
              <el-icon><EditPen /></el-icon>
              手动输入
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 识别结果 -->
    <div v-if="step === 'result'" class="result-section">
      <el-card class="result-card">
        <template #header>
          <h3>识别结果</h3>
        </template>
        <div class="result-content">
          <div class="result-image">
            <img :src="photoData" alt="识别图像" class="result-image-preview" />
          </div>
          <div class="result-info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="商品型号">
                <span class="result-value">{{ recognitionResult.modelName }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="生产厂家">
                <span class="result-value">{{ recognitionResult.manufacturer }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="置信度">
                <el-progress
                  :percentage="Math.round(recognitionResult.confidence * 100)"
                  :status="getConfidenceStatus(recognitionResult.confidence)"
                  stroke-width="8"
                  text-inside
                  style="width: 150px"
                />
              </el-descriptions-item>
              <el-descriptions-item label="匹配商品" v-if="matchedProduct">
                <span class="result-value matched">
                  ✅ {{ matchedProduct.name }} ({{ matchedProduct.sku }})
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="匹配状态" v-else>
                <el-tag type="warning">未找到匹配商品</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="识别文字" v-if="recognitionResult.ocrText">
                <div class="ocr-text">
                  <pre>{{ recognitionResult.ocrText }}</pre>
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </div>
          <div class="result-actions">
            <el-button @click="step = 'camera'">
              <el-icon><Refresh /></el-icon>
              重拍
            </el-button>
            <el-button @click="goToManualWithResult">
              <el-icon><EditPen /></el-icon>
              手动输入
            </el-button>
            <el-button type="primary" @click="confirmResult(false)" v-if="matchedProduct">
              <el-icon><Check /></el-icon>
              使用现有商品
            </el-button>
            <template v-if="props.mode !== 'outbound'">
              <el-button type="success" @click="confirmResult(true)" v-if="!matchedProduct">
                <el-icon><Check /></el-icon>
                创建新商品并提交
              </el-button>
              <el-button type="warning" @click="confirmResult(false)" v-if="!matchedProduct">
                <el-icon><Check /></el-icon>
                仅提交识别结果
              </el-button>
            </template>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 手动输入 -->
    <div v-if="step === 'manual'" class="manual-section">
      <el-card class="manual-card">
        <template #header>
          <h3>手动输入</h3>
        </template>
        <el-form
          ref="manualFormRef"
          :model="manualForm"
          :rules="manualRules"
          label-width="100px"
          class="manual-form"
        >
          <el-form-item label="商品型号" prop="modelName">
            <el-input v-model="manualForm.modelName" placeholder="请输入商品型号" />
          </el-form-item>
          <el-form-item label="生产厂家" prop="manufacturer">
            <el-input v-model="manualForm.manufacturer" placeholder="请输入生产厂家" />
          </el-form-item>
          <el-form-item>
            <el-button @click="step = 'camera'">
              <el-icon><Camera /></el-icon>
              拍照识别
            </el-button>
            <el-button type="success" @click="confirmManualInput">
              <el-icon><Check /></el-icon>
              确认
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { ElMessage, ElForm, ElFormItem, ElInput, ElButton, ElDivider } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Loading, Refresh, EditPen, Check, Camera } from '@element-plus/icons-vue';
import CameraComponent from './CameraComponent.vue';
import { recognizeImage } from '@/utils/imageRecognition';
import type { RecognitionResult } from '@/utils/imageRecognition';

// 接收属性
const props = defineProps<{
  products?: any[]; // 商品列表，用于检查是否匹配
  mode?: 'inbound' | 'outbound'; // 使用场景：入库或出库
}>();

// 暴露事件
const emit = defineEmits<{
  (e: 'result', data: RecognitionResult, createNew?: boolean): void;
  (e: 'cancel'): void;
}>();

// 状态
const step = ref<'camera' | 'recognizing' | 'result' | 'manual'>('camera');
const photoData = ref<string | null>(null);
const recognitionResult = ref<RecognitionResult>({
  modelName: '未识别',
  manufacturer: '未识别',
  confidence: 0,
  ocrText: ''
});
const recognitionProgress = ref(0);
const matchedProduct = ref<any>(null); // 匹配到的商品

// 手动输入表单
const manualFormRef = ref<FormInstance>();
const manualForm = reactive({
  modelName: '',
  manufacturer: ''
});

const manualRules = reactive<FormRules>({
  modelName: [
    { required: true, message: '请输入商品型号', trigger: 'blur' }
  ],
  manufacturer: [
    { required: true, message: '请输入生产厂家', trigger: 'blur' }
  ]
});

// 处理拍照完成
const handlePhotoTaken = async (data: string) => {
  photoData.value = data;
  step.value = 'recognizing';
  await performRecognition(data);
};

// 执行图像识别
const performRecognition = async (imageData: string) => {
  try {
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      if (recognitionProgress.value < 90) {
        recognitionProgress.value += Math.floor(Math.random() * 10);
      }
    }, 200);

    // 执行识别
    const { result } = await recognizeImage(imageData);
    recognitionResult.value = result;

    // 检查是否匹配到商品
    matchedProduct.value = findMatchingProduct(recognitionResult.value);

    clearInterval(progressInterval);
    recognitionProgress.value = 100;

    // 稍微延迟以显示100%进度
    setTimeout(() => {
      step.value = 'result';
    }, 500);
  } catch (error: any) {
    console.error('图像识别失败:', error);
    ElMessage.error('图像识别失败，请重试或手动输入');
    step.value = 'camera';
  }
};

// 查找匹配的商品
const findMatchingProduct = (result: RecognitionResult): any => {
  if (!props.products || props.products.length === 0) {
    return null;
  }

  // 优化的匹配策略
  const matches = [];
  const resultModelLower = result.modelName?.toLowerCase() || '';
  const resultManufacturerLower = result.manufacturer?.toLowerCase() || '';

  for (const product of props.products) {
    const productNameLower = product.name?.toLowerCase() || '';
    const productSkuLower = product.sku?.toLowerCase() || '';
    const productManufacturerLower = product.manufacturer?.toLowerCase() || '';

    // 计算匹配分数
    let score = 0;

    // 名称完全匹配
    if (productNameLower === resultModelLower || productNameLower === resultManufacturerLower) {
      score += 100;
    }
    // 名称包含匹配
    if (productNameLower.includes(resultModelLower)) score += 50;
    if (productNameLower.includes(resultManufacturerLower)) score += 30;

    // SKU匹配
    if (productSkuLower === resultModelLower) score += 100;
    if (productSkuLower.includes(resultModelLower)) score += 60;

    // 厂家匹配
    if (productManufacturerLower === resultManufacturerLower) score += 50;
    if (productManufacturerLower.includes(resultManufacturerLower)) score += 25;

    // 组合匹配：厂家+型号
    if (productNameLower.includes(resultManufacturerLower) && productNameLower.includes(resultModelLower)) {
      score += 80;
    }

    // 至少有一些匹配才添加到结果中
    if (score > 20) {
      matches.push({
        product,
        score
      });
    }
  }

  // 根据分数排序，返回分数最高的匹配
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    console.log('匹配结果分数:', matches.map(m => ({
      name: m.product.name,
      score: m.score
    })));

    return matches[0].product;
  }

  return null;
};

// 获取置信度状态
const getConfidenceStatus = (confidence: number) => {
  if (confidence > 0.8) {
    return 'success';
  } else if (confidence > 0.5) {
    return 'warning';
  } else {
    return 'exception';
  }
};

// 确认识别结果
const confirmResult = (createNew: boolean = false) => {
  emit('result', recognitionResult.value, createNew);
};

// 跳转到手动输入并带入识别结果
const goToManualWithResult = () => {
  manualForm.modelName = recognitionResult.value.modelName;
  manualForm.manufacturer = recognitionResult.value.manufacturer;
  step.value = 'manual';
};

// 确认手动输入
const confirmManualInput = async () => {
  if (!manualFormRef.value) return;

  try {
    await manualFormRef.value.validate();
    emit('result', {
      modelName: manualForm.modelName,
      manufacturer: manualForm.manufacturer,
      confidence: 1, // 手动输入的置信度为100%
      ocrText: '' // 手动输入没有OCR文字
    });
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 取消
const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.image-recognition-container {
  max-width: 600px;
  margin: 0 auto;
}

/* 拍照界面 */
.camera-section {
  margin-bottom: 20px;
}

.camera-card {
  margin-bottom: 20px;
}

/* 确保 CameraComponent 有足够的高度 */
.camera-card :deep(.el-card__body) {
  padding: 16px;
  min-height: 400px;
}

.manual-entry {
  margin-top: 20px;
  text-align: center;
}

/* 识别过程 */
.recognizing-section {
  margin-bottom: 20px;
}

.recognizing-card {
  margin-bottom: 20px;
}

.recognition-content {
  text-align: center;
  padding: 40px 0;
}

.recognition-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 20px;
}

.recognition-text {
  font-size: 18px;
  color: #606266;
  margin-bottom: 20px;
}

.recognition-progress {
  margin: 20px 40px;
}

.recognition-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 识别结果 */
.result-section {
  margin-bottom: 20px;
}

.result-card {
  margin-bottom: 20px;
}

.result-content {
  text-align: center;
}

.result-image-preview {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.result-value {
  font-weight: bold;
  color: #409EFF;
}

.ocr-text {
  max-height: 150px;
  overflow-y: auto;
  text-align: left;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
}

.ocr-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 12px;
  line-height: 1.5;
  color: #606266;
}

.result-info {
  text-align: left;
  margin-bottom: 20px;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 手动输入 */
.manual-section {
  margin-bottom: 20px;
}

.manual-card {
  margin-bottom: 20px;
}

.manual-form {
  text-align: left;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-recognition-container {
    padding: 0 10px;
  }

  .recognition-content {
    padding: 20px 0;
  }

  .recognition-icon {
    font-size: 32px;
  }

  .recognition-text {
    font-size: 16px;
  }

  .result-value {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .image-recognition-container {
    padding: 0;
  }

  .recognition-content {
    padding: 10px 0;
  }

  .result-image-preview {
    max-height: 200px;
  }
}
</style>
