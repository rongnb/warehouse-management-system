#!/usr/bin/env node
/**
 * WMS 控制脚本 — 检测/停止 WMS 服务，被 start.bat / stop.bat / dev.bat 调用
 *
 * 用法:
 *   node wms-control.js status   [--port 3000]
 *   node wms-control.js stop     [--port 3000] [--also-port 5173]
 *   node wms-control.js wait-up  [--port 3000] [--timeout 30]
 *
 * 退出码 (status):
 *   0 = WMS 正在运行 (端口由 WMS 自己监听)
 *   1 = 端口空闲，WMS 未运行
 *   2 = 端口被其它进程占用 (非 WMS)
 *
 * 退出码 (stop / wait-up):
 *   0 成功 / 1 失败
 *
 * 设计说明：
 *   - 不只看端口占用，而是同时验证占用进程的命令行是否是本项目的 node 进程，
 *     从而避免 "WMS 残留进程" 或 "其它 node 项目" 引发的误判。
 */

const { execSync, spawnSync } = require('child_process');
const http = require('http');

const WMS_CMD_REGEX =
  /backend[\\/](server|db[\\/]init)\.js|warehouse-management|nodemon[^\n]*server\.js|vite[\\/]bin[\\/]vite|[\\/]vite\.js|frontend[^\n]*vite|vite[^\n]*frontend/i;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    } else {
      out._.push(a);
    }
  }
  return out;
}

function getPortPid(port) {
  try {
    const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
    const lines = out.split(/\r?\n/);
    for (const line of lines) {
      // 形如:  TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
      const m = line.match(/^\s*TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
      if (m && Number(m[1]) === port) return Number(m[2]);
    }
  } catch (_) {}
  return null;
}

function getProcessInfo(pid) {
  if (!pid) return null;
  try {
    // 用 wmic 拿命令行；在 Win11/Server 上 wmic 可能被移除，做兜底
    const r = spawnSync(
      'wmic',
      ['process', 'where', `ProcessId=${pid}`, 'get', 'Name,CommandLine', '/format:list'],
      { encoding: 'utf8' }
    );
    if (r.status === 0 && r.stdout) {
      const info = {};
      r.stdout.split(/\r?\n/).forEach((l) => {
        const m = l.match(/^([A-Za-z]+)=(.*)$/);
        if (m) info[m[1].toLowerCase()] = m[2];
      });
      if (info.name) {
        return { pid, name: info.name, cmd: info.commandline || '' };
      }
    }
  } catch (_) {}

  // 兜底：powershell.exe
  try {
    const r = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object -Property Name,CommandLine | Format-List`,
      ],
      { encoding: 'utf8' }
    );
    if (r.status === 0 && r.stdout) {
      const info = {};
      r.stdout.split(/\r?\n/).forEach((l) => {
        const m = l.match(/^(\w+)\s*:\s*(.*)$/);
        if (m) info[m[1].toLowerCase()] = m[2];
      });
      if (info.name) return { pid, name: info.name, cmd: info.commandline || '' };
    }
  } catch (_) {}

  return { pid, name: 'unknown', cmd: '' };
}

function isWmsProcess(info) {
  if (!info) return false;
  if (!/node\.exe/i.test(info.name)) return false;
  return WMS_CMD_REGEX.test(info.cmd);
}

function listAllWmsProcesses() {
  const result = [];
  try {
    const r = spawnSync(
      'wmic',
      ['process', 'where', "Name='node.exe'", 'get', 'ProcessId,CommandLine', '/format:list'],
      { encoding: 'utf8' }
    );
    if (r.status === 0 && r.stdout) {
      const blocks = r.stdout.split(/\r?\n\r?\n+/);
      for (const b of blocks) {
        const obj = {};
        b.split(/\r?\n/).forEach((l) => {
          const m = l.match(/^([A-Za-z]+)=(.*)$/);
          if (m) obj[m[1].toLowerCase()] = m[2];
        });
        if (obj.processid && WMS_CMD_REGEX.test(obj.commandline || '')) {
          result.push({ pid: Number(obj.processid), name: 'node.exe', cmd: obj.commandline });
        }
      }
      return result;
    }
  } catch (_) {}

  // 兜底用 powershell
  try {
    const r = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      { encoding: 'utf8' }
    );
    if (r.status === 0 && r.stdout.trim()) {
      let arr = JSON.parse(r.stdout);
      if (!Array.isArray(arr)) arr = [arr];
      for (const o of arr) {
        if (o && WMS_CMD_REGEX.test(o.CommandLine || '')) {
          result.push({ pid: Number(o.ProcessId), name: 'node.exe', cmd: o.CommandLine });
        }
      }
    }
  } catch (_) {}
  return result;
}

function killPid(pid) {
  try {
    spawnSync('taskkill', ['/F', '/PID', String(pid)], { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function httpProbe(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/',
        method: 'HEAD',
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve(true); // 任何 HTTP 响应都视为存活
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function detectStatus(port) {
  const pid = getPortPid(port);
  if (!pid) return { state: 'free' };
  const info = getProcessInfo(pid);
  if (isWmsProcess(info)) return { state: 'wms', info };

  // 兼容兜底：如果端口被 node.exe 占用，并且 HTTP 探测能拿到响应，
  // 视为 WMS（处理旧版 start.bat 启动后命令行里没有项目路径的情况）
  if (info && /node\.exe/i.test(info.name)) {
    const alive = await httpProbe(port, 1500);
    if (alive) return { state: 'wms', info };
  }

  return { state: 'busy', info };
}

async function cmdStatus(args) {
  const port = Number(args.port || 3000);
  const r = await detectStatus(port);
  if (r.state === 'wms') {
    console.log(`[OK] WMS 正在运行 (PID ${r.info.pid})  http://localhost:${port}`);
    process.exit(0);
  }
  if (r.state === 'free') {
    console.log(`[i] 端口 ${port} 空闲，WMS 未运行`);
    process.exit(1);
  }
  console.log(`[X] 端口 ${port} 被其它进程占用：PID=${r.info.pid} 进程=${r.info.name}`);
  if (r.info.cmd) console.log(`    命令行: ${r.info.cmd}`);
  process.exit(2);
}

async function cmdStop(args) {
  const port = Number(args.port || 3000);
  const alsoPort = Number(args['also-port'] || 5173);
  let any = false;

  const procs = listAllWmsProcesses();
  for (const p of procs) {
    console.log(`[-] 终止 WMS 进程 PID ${p.pid}`);
    if (killPid(p.pid)) any = true;
  }

  for (const pp of [port, alsoPort]) {
    const pid = getPortPid(pp);
    if (pid) {
      const info = getProcessInfo(pid);
      console.log(`[-] 终止占用端口 ${pp} 的进程 PID ${pid} (${info ? info.name : '?'})`);
      if (killPid(pid)) any = true;
    }
  }

  // 关闭 start.bat / dev.bat 启动的窗口
  try {
    spawnSync('taskkill', ['/F', '/FI', 'WINDOWTITLE eq WMS-Backend*'], { stdio: 'ignore' });
    spawnSync('taskkill', ['/F', '/FI', 'WINDOWTITLE eq WMS-Frontend*'], { stdio: 'ignore' });
  } catch (_) {}

  await new Promise((r) => setTimeout(r, 800));

  const after = await detectStatus(port);
  if (after.state === 'wms') {
    console.log(`[X] WMS 仍在运行 (PID ${after.info.pid})，停止失败`);
    process.exit(1);
  }
  console.log(any ? '[OK] WMS 服务已停止' : '[i] 未发现运行中的 WMS 服务');
  process.exit(0);
}

async function cmdWaitUp(args) {
  const port = Number(args.port || 3000);
  const timeoutSec = Number(args.timeout || 30);
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    const r = await detectStatus(port);
    if (r.state === 'wms') {
      console.log(`[OK] WMS 已就绪  http://localhost:${port}`);
      process.exit(0);
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  console.log(`[X] 等待 WMS 启动超时 (${timeoutSec} 秒)`);
  process.exit(1);
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const action = args._[0];
  try {
    if (action === 'status') return cmdStatus(args);
    if (action === 'stop') return cmdStop(args);
    if (action === 'wait-up') return cmdWaitUp(args);
    console.error('用法: node wms-control.js <status|stop|wait-up> [--port N] [--timeout N] [--also-port N]');
    process.exit(64);
  } catch (e) {
    console.error('[X] wms-control 出错:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();

// 让 lint 安心

