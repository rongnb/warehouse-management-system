const http = require('http');
const fs = require('fs');
const path = require('path');

const baseUrl = 'http://localhost:3000/api';
const logsDir = path.join(__dirname, 'logs');

console.log('=== 检查最新错误日志 ===\n');

// 1. 直接读取本地日志文件（如果有的话）
if (fs.existsSync(logsDir)) {
  console.log('1. 检查本地日志文件:');
  const files = fs.readdirSync(logsDir)
    .filter(file => file.startsWith('error-') || file.startsWith('combined-'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(logsDir, a));
      const statB = fs.statSync(path.join(logsDir, b));
      return statB.mtime - statA.mtime;
    });

  console.log('   找到日志文件:', files);

  // 读取最新的 error 和 combined 日志
  const errorFile = files.find(f => f.startsWith('error-'));
  const combinedFile = files.find(f => f.startsWith('combined-'));

  if (errorFile) {
    console.log('\n2. 最新错误日志:');
    console.log(`   文件名: ${errorFile}`);
    console.log('   最新 50 行:');

    const content = fs.readFileSync(path.join(logsDir, errorFile), 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const lastLines = lines.slice(Math.max(0, lines.length - 50));

    lastLines.forEach(line => {
      console.log('   ' + line);
    });
  }

  if (combinedFile) {
    console.log('\n3. 最新综合日志:');
    console.log(`   文件名: ${combinedFile}`);
    console.log('   最新 100 行:');

    const content = fs.readFileSync(path.join(logsDir, combinedFile), 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const lastLines = lines.slice(Math.max(0, lines.length - 100));

    lastLines.forEach(line => {
      if (line.includes('更新') || line.includes('product') || line.includes('ERROR') || line.includes('WARN')) {
        console.log('   ' + line);
      }
    });
  }

  console.log('\n');
}

// 2. 同时尝试通过API获取
console.log('4. 通过API获取系统状态...');

const loginOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const loginData = JSON.stringify({
  username: 'admin',
  password: '123456'
});

let token;

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(body);
      token = result.token;

      // 获取系统状态
      const statusOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/logs/status',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const statusReq = http.request(statusOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const result = JSON.parse(body);
          if (res.statusCode === 200) {
            console.log('   ✓ 系统状态正常');
            console.log(`   运行时间: ${result.uptime.formatted}`);
            console.log(`   内存使用: ${result.memory.heapUsedFormatted}`);
          }
        });
      });
      statusReq.end();
    }
  });
});
loginReq.write(loginData);
loginReq.end();

// 处理连接错误
loginReq.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('   ✗ 后端服务未运行');
  } else {
    console.log('   ✗ 请求失败:', err.message);
  }
});
