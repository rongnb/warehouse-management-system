<template>
  <div class="camera-container">
    <!-- 调试信息 -->
    <div v-if="debugMode" class="debug-info">
      <el-alert
        title="调试信息"
        type="info"
        :closable="false"
        class="debug-alert"
      >
        <p>状态: {{ showCamera ? '摄像头已启动' : '未启动' }}</p>
        <p>是否支持多个摄像头: {{ hasMultipleCameras ? '是' : '否' }}</p>
        <p>当前 facingMode: {{ currentFacingMode }}</p>
      </el-alert>
    </div>

    <!-- 摄像头视图 -->
    <div v-if="showCamera" class="camera-view">
      <video
        ref="videoRef"
        class="camera-video"
        autoplay
        playsinline
        muted
        id="cameraVideo"
      >
        <source src="" type="video/mp4">
        您的浏览器不支持视频播放。
      </video>
      <canvas ref="canvasRef" class="camera-canvas"></canvas>

      <!-- 加载提示 -->
      <div v-if="isLoading" class="loading-overlay">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p>正在启动摄像头...</p>
      </div>
    </div>

    <!-- 照片预览 -->
    <div v-if="photoData && !showCamera" class="photo-preview">
      <img :src="photoData" alt="预览照片" class="preview-image" />
      <div class="preview-controls">
        <el-button type="primary" @click="retake">
          <el-icon><Refresh /></el-icon>
          重拍
        </el-button>
        <el-button type="success" @click="confirm">
          <el-icon><Check /></el-icon>
          确认
        </el-button>
        <el-button @click="cancel">
          <el-icon><Close /></el-icon>
          取消
        </el-button>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div v-if="showCamera" class="camera-controls">
      <div class="top-controls">
        <el-button
          v-if="hasMultipleCameras"
          type="text"
          @click="toggleCamera"
          class="camera-switch"
        >
          <el-icon><VideoCamera /></el-icon>
          切换摄像头
        </el-button>
        <el-button type="text" @click="cancel" class="cancel-button">
          <el-icon><Close /></el-icon>
          取消
        </el-button>
      </div>

      <div class="bottom-controls">
        <el-button type="text" @click="uploadImage" class="upload-button">
          <el-icon><Upload /></el-icon>
          从相册选择
        </el-button>
        <el-button
          type="primary"
          @click="takePhoto"
          :disabled="isTakingPhoto"
          class="take-photo-button"
        >
          {{ isTakingPhoto ? '拍照中...' : '拍照' }}
        </el-button>
      </div>
    </div>

    <!-- 图片上传区域 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="file-input"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoCamera, Refresh, Check, Close, Upload, Loading } from '@element-plus/icons-vue';

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const streamRef = ref<MediaStream | null>(null);

// 状态
const showCamera = ref(false);
const isTakingPhoto = ref(false);
const photoData = ref<string | null>(null);
const hasMultipleCameras = ref(false);
const currentFacingMode = ref<'user' | 'environment'>('user'); // 桌面端默认使用前置摄像头（像镜子一样）
const hasFlash = ref(false);
const flashEnabled = ref(false);
const debugMode = ref(true); // 调试模式，显示详细信息
const isLoading = ref(false); // 加载状态

// 配置
const videoConstraints = ref({
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: currentFacingMode.value,
});

// 暴露事件
const emit = defineEmits<{
  (e: 'photo-taken', data: string): void;
  (e: 'cancel'): void;
}>();

// 初始化摄像头
const initializeCamera = async () => {
  isLoading.value = true;
  try {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || !mediaDevices.getUserMedia) {
      throw new Error('浏览器不支持摄像头访问，请使用Chrome、Edge或Firefox浏览器');
    }

    // 检查是否是安全环境
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      throw new Error('摄像头访问需要HTTPS或localhost环境');
    }

    // 获取可用的视频输入设备
    const devices = await mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === 'videoinput');
    hasMultipleCameras.value = videoInputs.length > 1;
    hasFlash.value = devices.some((device) => device.kind === 'videoinput' && device.label.includes('flash'));

    console.log('可用的摄像头:', videoInputs);

    // 先尝试最简单的配置
    let constraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };

    // 如果有多个摄像头，优先使用用户选择的 facingMode
    if (hasMultipleCameras.value) {
      constraints.facingMode = currentFacingMode.value;
    }

    console.log('使用的摄像头配置:', constraints);

    // 启动摄像头
    streamRef.value = await mediaDevices.getUserMedia({
      video: constraints,
      audio: false,
    });

    console.log('摄像头流获取成功:', streamRef.value);

    if (videoRef.value) {
      videoRef.value.srcObject = streamRef.value;

      // 等待视频可以播放
      await new Promise<void>((resolve) => {
        if (videoRef.value) {
          videoRef.value.onloadedmetadata = () => {
            console.log('视频元数据加载完成');
            videoRef.value?.play().then(() => {
              console.log('视频开始播放');
              resolve();
            }).catch((err) => {
              console.error('视频播放失败:', err);
              resolve();
            });
          };

          // 超时处理，3秒后强制继续
          setTimeout(() => {
            console.log('超时，强制继续');
            resolve();
          }, 3000);
        }
      });

      showCamera.value = true;
      isLoading.value = false;
      console.log('showCamera 设置为 true');
    }
  } catch (error: any) {
    isLoading.value = false;
    console.error('初始化摄像头失败:', error);

    let errorMsg = '摄像头访问失败';
    if (error.name === 'NotAllowedError') {
      errorMsg = '请允许访问摄像头权限';
    } else if (error.name === 'NotFoundError') {
      errorMsg = '未找到摄像头设备';
    } else if (error.name === 'NotReadableError') {
      errorMsg = '摄像头被其他程序占用';
    } else if (error.name === 'OverconstrainedError') {
      errorMsg = '无法满足摄像头配置要求';
    } else {
      errorMsg = error.message || '摄像头访问失败';
    }

    ElMessage.error(errorMsg);
    emit('cancel');
  }
};

// 拍照
const takePhoto = async () => {
  if (!videoRef.value || !canvasRef.value) {
    ElMessage.error('视频元素未就绪');
    return;
  }

  isTakingPhoto.value = true;

  try {
    // 设置画布尺寸与视频一致
    const videoWidth = videoRef.value.videoWidth;
    const videoHeight = videoRef.value.videoHeight;
    canvasRef.value.width = videoWidth;
    canvasRef.value.height = videoHeight;

    // 绘制图片到画布
    const context = canvasRef.value.getContext('2d');
    if (context) {
      context.drawImage(
        videoRef.value,
        0,
        0,
        videoWidth,
        videoHeight
      );

      // 转换为Base64
      photoData.value = canvasRef.value.toDataURL('image/jpeg', 0.8);
      showCamera.value = false;
    }
  } catch (error: any) {
    console.error('拍照失败:', error);
    ElMessage.error('拍照失败');
  } finally {
    isTakingPhoto.value = false;
  }
};

// 重拍
const retake = () => {
  photoData.value = null;
  showCamera.value = true;
};

// 确认照片
const confirm = () => {
  if (photoData.value) {
    emit('photo-taken', photoData.value);
    stopCamera();
  }
};

// 取消
const cancel = () => {
  stopCamera();
  emit('cancel');
};

// 停止摄像头
const stopCamera = () => {
  if (streamRef.value) {
    streamRef.value.getTracks().forEach((track) => track.stop());
    streamRef.value = null;
  }
  showCamera.value = false;
  photoData.value = null;
};

// 切换摄像头
const toggleCamera = async () => {
  currentFacingMode.value = currentFacingMode.value === 'user' ? 'environment' : 'user';
  videoConstraints.value.facingMode = currentFacingMode.value;
  await stopCamera();
  await initializeCamera();
};

// 切换闪光灯
const switchFlash = async () => {
  if (!streamRef.value) return;

  const videoTrack = streamRef.value.getVideoTracks()[0];
  if (!videoTrack) return;

  flashEnabled.value = !flashEnabled.value;
  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: flashEnabled.value }],
    });
  } catch (error) {
    console.error('切换闪光灯失败:', error);
    ElMessage.error('设备不支持闪光灯控制');
    flashEnabled.value = !flashEnabled.value;
  }
};

// 上传图片
const uploadImage = () => {
  fileInputRef.value?.click();
};

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target?.result as string;
      photoData.value = dataURL;
      showCamera.value = false;
    };
    reader.readAsDataURL(file);
  }

  // 重置input值，以便选择相同文件时也能触发change事件
  target.value = '';
};

// 组件挂载时初始化摄像头
onMounted(() => {
  initializeCamera();
});

// 组件卸载时停止摄像头
onUnmounted(() => {
  stopCamera();
});
</script>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 600px;
  margin: 0 auto;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
}

.camera-view {
  position: relative;
  width: 100%;
  height: 60vh;
  min-height: 300px;
  max-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scaleX(-1); /* 水平翻转，像镜子一样 */
}

.camera-canvas {
  display: none;
}

/* 加载覆盖层 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  color: #fff;
}

.loading-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  font-size: 16px;
}

/* 调试信息 */
.debug-info {
  margin-bottom: 10px;
}

.debug-alert {
  margin-bottom: 10px;
}

.debug-alert :deep(.el-alert__content) {
  font-size: 12px;
}

.debug-alert p {
  margin: 5px 0;
  font-size: 12px;
}

.photo-preview {
  position: relative;
  width: 100%;
  height: 60vh;
  min-height: 300px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #000;
}

.preview-image {
  max-width: 100%;
  max-height: 80%;
  object-fit: contain;
}

.preview-controls {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.camera-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.bottom-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.camera-switch,
.cancel-button,
.upload-button,
.flash-button {
  color: #fff;
  font-size: 14px;
}

.take-photo-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  font-size: 16px;
  font-weight: bold;
}

.file-input {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .camera-container {
    border-radius: 0;
  }

  .camera-view,
  .photo-preview {
    height: 70vh;
    min-height: 250px;
  }

  .camera-controls {
    padding: 12px;
  }

  .take-photo-button {
    width: 50px;
    height: 50px;
  }

  .camera-switch,
  .cancel-button,
  .upload-button,
  .flash-button {
    font-size: 12px;
    padding: 6px 8px;
  }

  .preview-controls {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .camera-view,
  .photo-preview {
    height: 60vh;
    min-height: 200px;
  }

  .take-photo-button {
    width: 45px;
    height: 45px;
    font-size: 14px;
  }
}
</style>
