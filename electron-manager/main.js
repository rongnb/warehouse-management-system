const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    show: true,
    center: true,
    title: '仓库管理系统 - 管理工具',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.center();
  mainWindow.focus();

  // 调试：打开开发工具
  mainWindow.webContents.openDevTools();

  // 处理加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });
}

// 禁用 sandbox 以解决 Linux 权限问题
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-setuid-sandbox');
// 禁用 /dev/shm 共享内存，改用 /tmp，解决共享内存权限崩溃问题
app.commandLine.appendSwitch('--disable-dev-shm-usage');
// 禁用 GPU 解决一些 Linux 环境下窗口不显示的问题
app.commandLine.appendSwitch('--disable-gpu');
// 使用软件渲染，避免 GPU 驱动问题
app.commandLine.appendSwitch('--use-gl', 'swiftshader');
// 禁用GPU compositing
app.commandLine.appendSwitch('--disable-compositing');
// 使用单进程模式，避免多进程共享内存问题
app.commandLine.appendSwitch('--single-process');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理命令执行
function runCommand(command, args, cwd, callback) {
  const proc = spawn(command, args, { cwd: cwd });

  proc.stdout.on('data', (data) => {
    const text = data.toString();
    mainWindow.webContents.send('command-output', text);
    callback(null, text);
  });

  proc.stderr.on('data', (data) => {
    const text = data.toString();
    mainWindow.webContents.send('command-output', text);
    callback(null, text);
  });

  proc.on('close', (code) => {
    mainWindow.webContents.send('command-complete', code);
    callback(null, `命令完成，退出码: ${code}`);
  });

  proc.on('error', (err) => {
    mainWindow.webContents.send('command-output', `错误: ${err.message}\n`);
    callback(err, null);
  });

  return proc;
}

// 启动服务
ipcMain.handle('start-services', async () => {
  mainWindow.webContents.send('command-output', '🚀 正在启动仓库管理系统...\n\n');
  const projectRoot = path.join(__dirname, '..');
  runCommand('bash', ['start.sh'], projectRoot, () => {});
});

// 停止服务
ipcMain.handle('stop-services', async () => {
  mainWindow.webContents.send('command-output', '🛑 正在停止仓库管理系统...\n\n');
  const projectRoot = path.join(__dirname, '..');
  runCommand('bash', ['stop.sh'], projectRoot, () => {});
});

// 重置密码
ipcMain.handle('reset-password', async () => {
  mainWindow.webContents.send('command-output', '🔐 正在重置管理员密码...\n\n');
  const projectRoot = path.join(__dirname, '..');
  runCommand('node', ['backend/reset-admin-password.js'], projectRoot, () => {});
});

// 检查服务状态
ipcMain.handle('check-status', async () => {
  const projectRoot = path.join(__dirname, '..');
  // 使用 lsof 检查端口
  const checkPort = (port) => {
    return new Promise((resolve) => {
      spawn('lsof', ['-t', `-i:${port}`], { cwd: projectRoot })
        .on('close', (code) => resolve(code === 0));
    });
  };

  const backendRunning = await checkPort(3000);
  const frontendRunning = await checkPort(5173);

  return { backendRunning, frontendRunning };
});
