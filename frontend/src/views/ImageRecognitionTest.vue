<template>
  <div class="test-container">
    <div class="page-header">
      <h2>OCR图像识别测试</h2>
      <el-button type="primary" @click="initializeEngine" :loading="initializing">
        <el-icon><Refresh /></el-icon>
        初始化识别引擎
      </el-button>
      <el-button type="success" @click="clearAll">
        <el-icon><Delete /></el-icon>
        清除记录
      </el-button>
    </div>

    <el-row :gutter="24">
      <!-- 左侧：输入区域 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <el-card class="input-card">
          <template #header>
            <div class="card-header">
              <span>📷 图像输入</span>
              <el-tag :type="engineStatus.type" size="small">
                {{ engineStatus.text }}
              </el-tag>
            </div>
          </template>

          <!-- 拍照/上传选项 -->
          <el-radio-group v-model="inputMode" class="input-mode">
            <el-radio-button value="camera">拍照</el-radio-button>
            <el-radio-button value="upload">上传图片</el-radio-button>
          </el-radio-group>

          <!-- 拍照模式 -->
          <div v-if="inputMode === 'camera'" class="camera-section">
            <CameraComponent
              @photo-taken="handlePhotoTaken"
              @cancel="handleCameraCancel"
            />
          </div>

          <!-- 上传模式 -->
          <div v-else class="upload-section">
            <el-upload
              class="image-uploader"
              drag
              :show-file-list="false"
              :on-change="handleFileChange"
              :auto-upload="false"
              accept="image/*"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                拖拽图片到此处或 <em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 jpg/png 文件，最大 5MB
                </div>
              </template>
            </el-upload>
          </div>

          <!-- 当前图片预览 -->
          <div v-if="currentImage" class="current-image-section">
            <el-divider content-position="left">当前图片</el-divider>
            <div class="image-preview-wrapper">
              <img :src="currentImage" alt="当前图片" class="preview-image" />
            </div>
            <div class="image-actions">
              <el-button type="primary" @click="startRecognition" :disabled="!engineReady || recognizing">
                <el-icon><View /></el-icon>
                {{ recognizing ? '识别中...' : '开始识别' }}
              </el-button>
              <el-button @click="clearCurrentImage">
                <el-icon><Delete /></el-icon>
                清除
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 历史记录 -->
        <el-card class="history-card" style="margin-top: 20px;">
          <template #header>
            <span>📋 识别历史 ({{ history.length }})</span>
          </template>
          <div class="history-list" v-if="history.length > 0">
            <div
              v-for="(item, index) in history"
              :key="item.id"
              class="history-item"
              @click="loadHistoryItem(item)"
            >
              <div class="history-thumb">
                <img :src="item.image" alt="缩略图" />
              </div>
              <div class="history-info">
                <div class="history-title">
                  #{{ history.length - index }} - {{ formatTime(item.timestamp) }}
                </div>
                <div class="history-result">
                  <el-tag size="small" type="info">
                    {{ item.result.modelName }}
                  </el-tag>
                  <el-tag size="small" type="success">
                    {{ item.result.manufacturer }}
                  </el-tag>
                </div>
                <div class="history-duration">
                  耗时: {{ item.duration }}ms
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无识别记录" />
        </el-card>
      </el-col>

      <!-- 右侧：结果显示 -->
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <!-- 识别进度 -->
        <el-card class="progress-card" v-if="recognizing">
          <template #header>
            <span>⏳ 识别中...</span>
          </template>
          <div class="progress-content">
            <el-icon class="loading-icon"><Loading /></el-icon>
            <div class="progress-text">{{ recognitionStatus }}</div>
            <el-progress
              :percentage="recognitionProgress"
              :status="recognitionProgress === 100 ? 'success' : undefined"
              style="margin-top: 20px"
            />
          </div>
        </el-card>

        <!-- 识别结果 -->
        <el-card class="result-card" v-if="currentResult">
          <template #header>
            <div class="card-header">
              <span>✅ 识别结果</span>
              <el-tag type="success" size="small">
                耗时: {{ currentDuration }}ms
              </el-tag>
            </div>
          </template>

          <!-- 图像处理显示 -->
          <div v-if="processedImages.original || processedImages.processed || processedImages.cropped" class="processed-images">
            <el-divider content-position="left">图像处理过程</el-divider>
            <el-row :gutter="8">
              <el-col :span="8" v-if="processedImages.original">
                <div class="image-section">
                  <div class="image-label">1. 原图</div>
                  <img :src="processedImages.original" class="processed-image" />
                </div>
              </el-col>
              <el-col :span="8" v-if="processedImages.processed">
                <div class="image-section">
                  <div class="image-label">2. 增强对比度</div>
                  <img :src="processedImages.processed" class="processed-image" />
                </div>
              </el-col>
              <el-col :span="8" v-if="processedImages.cropped">
                <div class="image-section">
                  <div class="image-label">3. 主体区域</div>
                  <img :src="processedImages.cropped" class="processed-image" />
                </div>
              </el-col>
            </el-row>
          </div>

          <el-descriptions :column="1" border class="result-descriptions">
            <el-descriptions-item label="商品型号">
              <el-input
                v-model="editableResult.modelName"
                class="editable-input"
                size="small"
              />
            </el-descriptions-item>
            <el-descriptions-item label="生产厂家">
              <el-input
                v-model="editableResult.manufacturer"
                class="editable-input"
                size="small"
              />
            </el-descriptions-item>
            <el-descriptions-item label="置信度">
              <el-progress
                :percentage="Math.round(currentResult.confidence * 100)"
                :status="getConfidenceStatus(currentResult.confidence)"
                stroke-width="8"
                text-inside
                style="width: 150px"
              />
            </el-descriptions-item>
          </el-descriptions>

          <el-divider content-position="left">OCR原始文字</el-divider>
          <el-input
            v-model="editableResult.ocrText"
            type="textarea"
            :rows="3"
            placeholder="原始OCR识别的文字"
            class="ocr-textarea"
          />

          <div class="result-actions" v-if="currentResult">
            <el-button type="primary" @click="copyResult">
              <el-icon><DocumentCopy /></el-icon>
              复制结果
            </el-button>
            <el-button type="warning" @click="saveChanges">
              <el-icon><EditPen /></el-icon>
              保存修改
            </el-button>
            <el-button type="success" @click="retryRecognition">
              <el-icon><Refresh /></el-icon>
              重新识别
            </el-button>
          </div>
        </el-card>

        <!-- 识别内容输出窗口 -->
        <el-card class="output-card" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>📋 识别内容输出</span>
              <el-button size="small" type="primary" @click="copyFullOutput">
                <el-icon><DocumentCopy /></el-icon>
                复制全部
              </el-button>
            </div>
          </template>
          <div class="output-container">
            <div class="output-section">
              <div class="output-label">🔍 识别结果</div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="商品型号">
                  {{ currentResult?.modelName || '未识别' }}
                </el-descriptions-item>
                <el-descriptions-item label="生产厂家">
                  {{ currentResult?.manufacturer || '未识别' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <div class="output-section">
              <div class="output-label">📝 完整OCR文本</div>
              <div class="full-ocr-text" v-if="fullOcrText">
                {{ fullOcrText }}
              </div>
              <div class="full-ocr-text" v-else>(无)</div>
            </div>
            <div class="output-section" v-if="currentResult">
              <div class="output-label">📊 识别详情</div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="置信度">
                  <el-tag :type="getConfidenceStatus(currentResult.confidence)" size="small">
                    {{ Math.round(currentResult.confidence * 100) }}%
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="耗时">
                  {{ currentDuration }}ms
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-card>

        <!-- 详细日志 -->
        <el-card class="log-card" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>📝 控制台日志</span>
              <el-button size="small" @click="clearLogs">
                <el-icon><Delete /></el-icon>
                清除
              </el-button>
            </div>
          </template>
          <div class="log-container" ref="logContainer">
            <div
              v-for="(log, index) in logs"
              :key="index"
              :class="['log-item', log.type]"
            >
              <span class="log-time">[{{ log.time }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="log-empty">
              暂无日志...
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Loading,
  Refresh,
  Delete,
  View,
  UploadFilled,
  DocumentCopy,
  EditPen
} from '@element-plus/icons-vue';
import CameraComponent from '@/components/CameraComponent.vue';
import {
  recognizeImage,
  initializeImageRecognizer,
  getImageRecognizer,
  disposeImageRecognizer
} from '@/utils/imageRecognition';
import type { RecognitionResult } from '@/utils/imageRecognition';

// 状态
const inputMode = ref<'camera' | 'upload'>('upload');
const currentImage = ref<string | null>(null);
const currentResult = ref<RecognitionResult | null>(null);
const currentDuration = ref(0);
const history = ref<Array<{
  id: number;
  image: string;
  result: RecognitionResult;
  duration: number;
  timestamp: number;
  processedImages?: { original?: string; cropped?: string };
}>>([]);
const recognizing = ref(false);
const recognitionProgress = ref(0);
const recognitionStatus = ref('准备中...');
const initializing = ref(false);
const logs = ref<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' | 'warn' }>>([]);
const logContainer = ref<HTMLElement>();

// 处理后的图像
const processedImages = reactive({
  original: '' as string,
  processed: '' as string,
  cropped: '' as string
});

// 可编辑的识别结果
const editableResult = reactive({
  modelName: '',
  manufacturer: '',
  ocrText: ''
});

// 引擎状态
const engineReady = ref(false);
const engineStatus = reactive({
  type: 'info' as 'info' | 'success' | 'warning' | 'danger',
  text: '未初始化'
});

// 直接存储完整OCR文本用于显示
const fullOcrText = ref('');

// 用于强制刷新输出窗口的key
const outputKey = ref(0);

// 历史记录ID计数器
let historyIdCounter = 0;

// 拦截console日志
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console)
};

const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  logs.value.push({ time, message, type });
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

// 安全的JSON字符串化函数，避免循环引用
const safeStringify = (obj: any): string => {
  try {
    if (obj && typeof obj === 'object') {
      // 简单对象直接转字符串
      if (Object.prototype.toString.call(obj) === '[object Object]' || Array.isArray(obj)) {
        return JSON.stringify(obj);
      }
      // 其他对象类型显示类型
      return String(obj);
    }
    return String(obj);
  } catch {
    return '[Circular]';
  }
};

// 拦截console
console.log = (...args) => {
  originalConsole.log(...args);
  addLog(args.map(safeStringify).join(' '), 'info');
};
console.error = (...args) => {
  originalConsole.error(...args);
  addLog(args.map(safeStringify).join(' '), 'error');
};
console.warn = (...args) => {
  originalConsole.warn(...args);
  addLog(args.map(safeStringify).join(' '), 'warn');
};

// 初始化引擎
const initializeEngine = async () => {
  if (initializing.value) return;

  initializing.value = true;
  engineStatus.type = 'warning';
  engineStatus.text = '初始化中...';

  try {
    addLog('开始初始化识别引擎...', 'info');
    const success = await initializeImageRecognizer();

    if (success) {
      engineReady.value = true;
      engineStatus.type = 'success';
      engineStatus.text = '就绪';
      addLog('识别引擎初始化成功!', 'success');
      ElMessage.success('识别引擎初始化成功');
    } else {
      engineStatus.type = 'danger';
      engineStatus.text = '初始化失败';
      addLog('识别引擎初始化失败', 'error');
      ElMessage.error('识别引擎初始化失败');
    }
  } catch (error) {
    engineStatus.type = 'danger';
    engineStatus.text = '初始化出错';
    addLog(`初始化出错: ${error}`, 'error');
    ElMessage.error('识别引擎初始化出错');
  } finally {
    initializing.value = false;
  }
};

// 处理拍照
const handlePhotoTaken = (data: string) => {
  currentImage.value = data;
  currentResult.value = null;
  addLog('拍照完成', 'success');
};

const handleCameraCancel = () => {
  addLog('拍照取消', 'warn');
};

// 处理文件上传
const handleFileChange = (file: any) => {
  if (!file.raw) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    currentImage.value = e.target?.result as string;
    currentResult.value = null;
    addLog('图片上传成功', 'success');
  };
  reader.onerror = () => {
    addLog('图片读取失败', 'error');
    ElMessage.error('图片读取失败');
  };
  reader.readAsDataURL(file.raw);
};

// 开始识别
const startRecognition = async () => {
  if (!currentImage.value || !engineReady.value || recognizing.value) return;

  recognizing.value = true;
  recognitionProgress.value = 0;
  recognitionStatus.value = '准备中...';
  currentResult.value = null;

  // 清除之前的处理图像
  processedImages.original = '';
  processedImages.cropped = '';

  const startTime = Date.now();

  try {
    addLog('开始识别...', 'info');

    const progressInterval = setInterval(() => {
      if (recognitionProgress.value < 80) {
        recognitionProgress.value += Math.floor(Math.random() * 10);
        if (recognitionProgress.value < 30) recognitionStatus.value = '图像预处理中...';
        else if (recognitionProgress.value < 60) recognitionStatus.value = '主体检测中...';
        else recognitionStatus.value = 'OCR识别中...';
      }
    }, 200);

    const { result, processedImages: procImages } = await recognizeImage(currentImage.value);

    clearInterval(progressInterval);
    recognitionProgress.value = 100;
    recognitionStatus.value = '完成';

    const duration = Date.now() - startTime;
    currentDuration.value = duration;

    // 更新直接显示的OCR文本
    fullOcrText.value = result.ocrText;

    // 强制更新识别结果 - 使用nextTick确保响应式更新
    await nextTick();
    currentResult.value = { ...result };
    console.log('✅ 识别结果已设置:', currentResult.value);

    // 强制刷新输出窗口
    outputKey.value++;

    // 显示处理后的图像
    console.log('📷 处理图像数据:', {
      hasOriginal: !!procImages.original,
      hasProcessed: !!procImages.processed,
      hasCropped: !!procImages.cropped
    });
    processedImages.original = procImages.original;
    processedImages.processed = procImages.processed || '';
    processedImages.cropped = procImages.cropped || '';

    // 更新可编辑结果 - 确保响应式更新
    editableResult.modelName = result.modelName;
    editableResult.manufacturer = result.manufacturer;
    editableResult.ocrText = result.ocrText;
    console.log('🧬 更新可编辑结果:', editableResult);

    addLog(`识别完成! 耗时: ${duration}ms`, 'success');
    addLog(`型号: ${result.modelName}, 厂家: ${result.manufacturer}`, 'info');

    historyIdCounter++;
    history.value.unshift({
      id: historyIdCounter,
      image: currentImage.value,
      result: { ...result },
      duration,
      timestamp: Date.now(),
      processedImages: {
        original: procImages.original,
        processed: procImages.processed,
        cropped: procImages.cropped
      }
    });

  } catch (error: any) {
    addLog(`识别失败: ${error.message || error}`, 'error');
    ElMessage.error('识别失败: ' + (error.message || error));
  } finally {
    recognizing.value = false;
  }
};

// 重新识别
const retryRecognition = () => {
  if (currentImage.value) {
    startRecognition();
  }
};

// 清除当前图片
const clearCurrentImage = () => {
  currentImage.value = null;
  currentResult.value = null;
  addLog('清除当前图片', 'info');
};

// 加载历史记录
const loadHistoryItem = (item: any) => {
  currentImage.value = item.image;
  currentResult.value = item.result;
  currentDuration.value = item.duration;

  // 更新可编辑结果
  editableResult.modelName = item.result.modelName;
  editableResult.manufacturer = item.result.manufacturer;
  editableResult.ocrText = item.result.ocrText;

  // 显示历史记录的处理图像
  if (item.processedImages) {
    processedImages.original = item.processedImages.original || '';
    processedImages.processed = item.processedImages.processed || '';
    processedImages.cropped = item.processedImages.cropped || '';
  }

  addLog('加载历史记录', 'info');
};

// 保存修改
const saveChanges = () => {
  if (!currentResult.value) {
    ElMessage.warning('没有可保存的结果');
    return;
  }

  // 更新当前结果
  currentResult.value.modelName = editableResult.modelName;
  currentResult.value.manufacturer = editableResult.manufacturer;
  currentResult.value.ocrText = editableResult.ocrText;

  // 如果有历史记录，也更新最新的一条
  if (history.value.length > 0) {
    history.value[0].result.modelName = editableResult.modelName;
    history.value[0].result.manufacturer = editableResult.manufacturer;
    history.value[0].result.ocrText = editableResult.ocrText;
  }

  addLog('修改已保存', 'success');
  ElMessage.success('修改已保存');
};

// 清除所有
const clearAll = () => {
  history.value = [];
  currentImage.value = null;
  currentResult.value = null;
  logs.value = [];
  addLog('所有记录已清除', 'warn');
  ElMessage.info('所有记录已清除');
};

// 清除日志
const clearLogs = () => {
  logs.value = [];
};

// 复制结果
const copyResult = () => {
  if (!currentResult.value) return;

  const text = `型号: ${currentResult.value.modelName}\n厂家: ${currentResult.value.manufacturer}\n\nOCR原文:\n${currentResult.value.ocrText}`;
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('结果已复制到剪贴板');
    addLog('结果已复制', 'success');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
};

// 复制全部输出
const copyFullOutput = () => {
  const text = `========================================
识别结果
========================================
商品型号: ${currentResult.value?.modelName || '未识别'}
生产厂家: ${currentResult.value?.manufacturer || '未识别'}
置信度: ${currentResult.value ? Math.round(currentResult.value.confidence * 100) : 0}%
耗时: ${currentDuration.value}ms

========================================
完整OCR文本
========================================
${fullOcrText.value || '(无)'}
========================================
`;
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('完整内容已复制到剪贴板');
    addLog('完整内容已复制', 'success');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
};

// 置信度状态
const getConfidenceStatus = (confidence: number) => {
  if (confidence > 0.8) return 'success';
  if (confidence > 0.5) return 'warning';
  return 'exception';
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

onMounted(() => {
  addLog('测试页面加载完成', 'success');
  addLog('点击"初始化识别引擎"开始', 'info');
});

onUnmounted(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});
</script>

<style scoped>
.test-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-mode {
  margin-bottom: 20px;
}

.camera-section,
.upload-section {
  margin-bottom: 20px;
}

.image-uploader {
  width: 100%;
}

.current-image-section {
  margin-top: 20px;
}

.image-preview-wrapper {
  text-align: center;
  margin-bottom: 15px;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.image-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.progress-content {
  text-align: center;
  padding: 40px 0;
}

.loading-icon {
  font-size: 48px;
  color: #409EFF;
  animation: rotate 1.5s linear infinite;
  margin-bottom: 20px;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-text {
  font-size: 18px;
  color: #606266;
}

.result-value {
  font-weight: bold;
  color: #409EFF;
  font-size: 16px;
}

.result-descriptions {
  margin-bottom: 20px;
}

.ocr-text-box {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.ocr-text-box pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f5f7fa;
}

.history-thumb {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.history-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.history-result {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.history-duration {
  font-size: 12px;
  color: #c0c4cc;
}

.log-container {
  height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-item {
  font-size: 12px;
  line-height: 1.8;
  padding: 2px 0;
}

.log-item.info {
  color: #d4d4d4;
}

.log-item.success {
  color: #4ec9b0;
}

.log-item.error {
  color: #f14c4c;
}

.log-item.warn {
  color: #dcdcaa;
}

.log-time {
  color: #6a9955;
  margin-right: 8px;
}

.log-empty {
  text-align: center;
  color: #6e7681;
  padding: 40px 0;
}

/* 可编辑输入框样式 */
.editable-input {
  width: 100%;
}

.editable-input :deep(.el-input__wrapper) {
  background-color: #f5f7fa;
}

.editable-input :deep(.el-input__wrapper.is-focus) {
  background-color: #fff;
}

.ocr-textarea {
  margin-bottom: 15px;
}

.ocr-textarea :deep(.el-textarea__inner) {
  background-color: #f5f7fa;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

/* 识别内容输出窗口 */
.output-card {
  background-color: #fafafa;
}

.output-container {
  margin-top: 10px;
}

.output-section {
  margin-bottom: 15px;
}

.output-section:last-child {
  margin-bottom: 0;
}

.output-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid #409EFF;
}

.full-ocr-text {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 处理后的图像显示 */
.processed-images {
  margin-bottom: 20px;
}

.image-section {
  text-align: center;
}

.image-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  font-weight: 500;
}

.processed-image {
  max-width: 100%;
  max-height: 200px;
  border: 2px solid #e4e7ed;
  border-radius: 4px;
  object-fit: contain;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .processed-images {
    margin-bottom: 15px;
  }

  .image-section {
    margin-bottom: 15px;
  }

  .processed-image {
    max-height: 150px;
  }
}

@media (max-width: 576px) {
  .processed-image {
    max-height: 120px;
  }

  .image-label {
    font-size: 11px;
  }
}
</style>
