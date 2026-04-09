<template>
  <div class="camera-wrapper">
    <!-- 调试信息 -->
    <div class="debug-bar">
      <span>状态: {{ statusText }}</span>
    </div>

    <!-- 主内容区 -->
    <div class="camera-main">
      <!-- 阶段1: 未启动 -->
      <div v-if="phase === 'idle'" class="idle-screen">
        <div class="idle-content">
          <div class="camera-icon">📷</div>
          <p>选择拍照方式</p>
          <button class="photo-btn" @click="openTestPage">
            📷 使用拍照功能
          </button>
          <div class="divider">
            <span>或者</span>
          </div>
          <button class="upload-btn" @click="triggerUpload">
            📁 从相册选择图片
          </button>
        </div>
      </div>

      <!-- 阶段2: 摄像头已启动 -->
      <div v-if="phase === 'camera'" class="camera-screen">
        <video
          ref="videoRef"
          class="camera-video"
          autoplay
          playsinline
          muted
        ></video>
        <canvas ref="canvasRef" class="debug-canvas"></canvas>

        <div class="camera-controls">
          <button class="cancel-btn" @click="cancel">取消</button>
          <button class="capture-btn" @click="capture" :disabled="isCapturing">
            {{ isCapturing ? '...' : '拍照' }}
          </button>
        </div>
      </div>

      <!-- 阶段3: 预览照片 -->
      <div v-if="phase === 'preview'" class="preview-screen">
        <!-- 调试信息 -->
        <div class="debug-info" v-if="photoData">
          <div>照片数据长度: {{ photoData.length }} 字符</div>
        </div>

        <!-- 预览图片 -->
        <img :src="photoData" class="preview-img" alt="预览" />

        <div class="preview-controls">
          <button class="retake-btn" @click="retake">重拍</button>
          <button class="confirm-btn" @click="confirm">确认</button>
        </div>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const streamRef = ref<MediaStream | null>(null);

type Phase = 'idle' | 'camera' | 'preview';
const phase = ref<Phase>('idle');
const isStarting = ref(false);
const isCapturing = ref(false);
const photoData = ref<string>('');

const emit = defineEmits<{
  (e: 'photo-taken', data: string): void;
  (e: 'cancel'): void;
}>();

const statusText = computed(() => {
  if (phase.value === 'idle') return '等待启动';
  if (phase.value === 'camera') return '摄像头已启动';
  if (phase.value === 'preview') return '预览照片';
  return '';
});

const canUseCamera = (): boolean => {
  // 始终返回 true，直接尝试启动
  // 如果浏览器不允许，getUserMedia 调用会失败，我们会在 catch 中提示用户
  return true;
};

const startCamera = async () => {
  if (isStarting.value) return;
  isStarting.value = true;

  console.log('=== 开始启动摄像头 ===');
  console.log('协议:', window.location.protocol);
  console.log('主机:', window.location.hostname);

  // 检查摄像头支持
  if (!canUseCamera()) {
    console.warn('摄像头不被支持:', window.location.protocol + '//' + window.location.hostname);
    alert(`📷 摄像头无法启动\n\n原因：当前浏览器不支持摄像头API\n解决方法：\n1. 👉 使用【从相册选择图片】（推荐，此功能可用）\n2. 或更换现代浏览器\n\n从相册选择同样可以识别条形码和文字！`);
    isStarting.value = false;
    return;
  }

  try {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) {
      throw new Error('navigator.mediaDevices 不存在');
    }

    const constraints = {
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
      audio: false,
    };

    streamRef.value = await mediaDevices.getUserMedia(constraints);
    console.log('获取到摄像头流');

    phase.value = 'camera';
    console.log('已切换到摄像头模式');

    if (videoRef.value && streamRef.value) {
      videoRef.value.srcObject = streamRef.value;
      await new Promise<void>((resolve) => {
        if (videoRef.value) {
          videoRef.value.onloadedmetadata = () => {
            console.log('视频元数据:', videoRef.value?.videoWidth, 'x', videoRef.value?.videoHeight);
            videoRef.value?.play().catch(() => {});
            // 再等待更长时间确保videoWidth和videoHeight可用
            setTimeout(() => {
              console.log('等待后视频尺寸:', videoRef.value?.videoWidth, 'x', videoRef.value?.videoHeight);
              resolve();
            }, 1000);
          };
          // 超时保护
          setTimeout(() => {
            console.log('超时，继续执行');
            resolve();
          }, 3000);
        }
      });
    }
  } catch (err: any) {
    console.error('摄像头错误:', err);
    alert(`无法启动摄像头: ${err.message}`);
  } finally {
    isStarting.value = false;
  }
};

const stopCamera = () => {
  if (streamRef.value) {
    streamRef.value.getTracks().forEach(track => track.stop());
    streamRef.value = null;
  }
};

// 完全按测试页面的方式实现capture()
const capture = async () => {
  console.log('=== 开始拍照 ===');
  if (!videoRef.value || !canvasRef.value) {
    alert('摄像头未准备好');
    return;
  }

  const video = videoRef.value;

  // 等待videoWidth和videoHeight加载完成，最多等3秒
  let waitCount = 0;
  const maxWait = 30; // 30 * 100ms = 3秒
  while (!video.videoWidth && waitCount < maxWait) {
    console.log('等待videoWidth加载，已等:', waitCount * 100, 'ms');
    await new Promise(resolve => setTimeout(resolve, 100));
    waitCount++;
  }

  if (!video.videoWidth) {
    console.log('video.videoWidth 为0，视频未就绪');
    alert('摄像头还未完全就绪，请稍等1-2秒再试');
    return;
  }

  isCapturing.value = true;

  try {
    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      alert('无法获取canvas上下文');
      return;
    }

    console.log('videoWidth:', video.videoWidth);
    console.log('videoHeight:', video.videoHeight);

    // 直接使用测试页面的方式，设置画布和视频尺寸相同
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log('画布尺寸:', canvas.width, canvas.height);

    // 最简单的绘制方法（测试页面的工作方式！）
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    console.log('直接绘制成功');

    // 生成照片数据
    photoData.value = canvas.toDataURL('image/jpeg', 0.8);
    console.log('照片数据生成:', photoData.value.length, '字符');

    // 切换到预览
    phase.value = 'preview';
    console.log('切换到预览阶段');
    stopCamera();
  } catch (err) {
    console.error('拍照错误:', err);
    alert('拍照失败');
  } finally {
    isCapturing.value = false;
  }
};

const retake = () => {
  photoData.value = '';
  startCamera();
};

const confirm = () => {
  if (photoData.value) {
    emit('photo-taken', photoData.value);
  }
};

const cancel = () => {
  stopCamera();
  phase.value = 'idle';
  photoData.value = '';
  emit('cancel');
};

const openTestPage = () => {
  // 检查是否可以使用摄像头
  if (!canUseCamera()) {
    console.warn('摄像头不可用:', window.location.protocol + '//' + window.location.hostname);
    alert(`📷 摄像头无法启动\n\n原因：当前浏览器不支持摄像头API\n解决方法：\n1. 👉 使用【从相册选择图片】（推荐，此功能可用）\n2. 或更换现代浏览器\n\n从相册选择同样可以识别条形码和文字！`);
    return;
  }

  // 打开测试页面，在新标签页
  const testWindow = window.open('/camera-test.html', '_blank');

  // 监听测试页面的消息
  const handleMessage = (event: MessageEvent) => {
    // 检查消息类型
    if (event.data && event.data.type === 'photo-taken') {
      console.log('收到测试页面的照片数据');
      photoData.value = event.data.data;
      phase.value = 'preview';
      stopCamera();

      // 移除事件监听
      window.removeEventListener('message', handleMessage);

      // 关闭测试页面
      if (testWindow) {
        testWindow.close();
      }
    }
  };

  // 添加事件监听
  window.addEventListener('message', handleMessage);

  // 超时保护：30秒后移除事件监听
  setTimeout(() => {
    window.removeEventListener('message', handleMessage);
  }, 30000);
};

const triggerUpload = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      photoData.value = event.target?.result as string;
      phase.value = 'preview';
      stopCamera();
    };
    reader.readAsDataURL(file);
  }
  target.value = '';
};
</script>

<style scoped>
.camera-wrapper {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.debug-bar {
  background: #333;
  color: #fff;
  padding: 8px 12px;
  font-size: 12px;
  font-family: monospace;
}

.camera-main {
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.hidden {
  display: none !important;
}

.debug-canvas {
  position: absolute;
  top: -9999px;
  left: -9999px;
}

.debug-info {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  color: #0f0;
  padding: 8px;
  font-size: 11px;
  font-family: monospace;
  z-index: 100;
}

/* 空闲界面 */
.idle-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.idle-content {
  text-align: center;
  padding: 40px 20px;
  color: white;
}

.camera-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.idle-content p {
  margin-bottom: 30px;
  font-size: 16px;
}


.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: rgba(255,255,255,0.7);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.3);
}

.divider span {
  padding: 0 15px;
}

.photo-btn {
  display: block;
  width: 220px;
  margin: 0 auto 15px;
  padding: 16px 32px;
  background: #409EFF;
  color: white;
  border: 2px solid #409EFF;
  border-radius: 30px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.photo-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.upload-btn {
  display: block;
  width: 220px;
  margin: 0 auto 15px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 30px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.hint {
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 8px;
  font-size: 13px;
  color: #fff3cd;
  max-width: 100%;
}

/* 摄像头界面 */
.camera-screen {
  flex: 1;
  position: relative;
  background: #000;
}

.camera-video {
  width: 100%;
  height: 400px;
  display: block;
  object-fit: cover;
}

.camera-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}

.cancel-btn {
  padding: 10px 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.capture-btn {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid rgba(255,255,255,0.3);
  font-size: 16px;
  font-weight: bold;
  color: #333;
  cursor: pointer;
}

.capture-btn:disabled {
  opacity: 0.5;
}

/* 预览界面 */
.preview-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
  min-height: 400px;
  position: relative;
}

.preview-img {
  flex: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #111;
  display: block;
  min-height: 300px;
}

.preview-controls {
  padding: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
  background: #222;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: linear-gradient(to top, rgba(34, 34, 34, 0.9), transparent);
  padding-bottom: 25px;
}

.retake-btn,
.confirm-btn {
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 16px;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.retake-btn {
  background: rgba(102, 102, 102, 0.9);
  color: white;
}

.confirm-btn {
  background: rgba(103, 194, 58, 0.9);
  color: white;
}

@media (max-width: 600px) {
  .camera-wrapper {
    border-radius: 0;
    max-width: 100%;
  }

  .camera-main,
  .camera-video {
    min-height: 350px;
  }
}
</style>
