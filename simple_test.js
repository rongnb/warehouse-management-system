#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WD = 'e:\\warehouse-management-system';

// Step 1: Delete temp files
console.log('\n=== STEP 1: Cleaning Temp Files ===\n');

const tempFiles = ['start.bat.new', 'stop.bat.new', 'dev.bat.new'];
for (const f of tempFiles) {
  const fp = path.join(WD, f);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    console.log(`DELETED: ${f}`);
  } else {
    console.log(`NOT FOUND: ${f}`);
  }
}

console.log('\n=== STEP 2: No Args (expect exit 64) ===\n');
const r2 = spawnSync('node', ['backend\\wms-control.js'], { cwd: WD, encoding: 'utf8', stdio: 'pipe' });
console.log('STDOUT:\n' + (r2.stdout || '(empty)'));
if (r2.stderr) console.log('STDERR:\n' + r2.stderr);
console.log('EXIT CODE: ' + r2.status);

console.log('\n=== STEP 3: Status --port 3000 (expect 0/1/2) ===\n');
const r3 = spawnSync('node', ['backend\\wms-control.js', 'status', '--port', '3000'], { cwd: WD, encoding: 'utf8', stdio: 'pipe' });
console.log('STDOUT:\n' + (r3.stdout || '(empty)'));
if (r3.stderr) console.log('STDERR:\n' + r3.stderr);
console.log('EXIT CODE: ' + r3.status);

console.log('\n=== STEP 4: Syntax Check ===\n');
const r4 = spawnSync('node', ['--check', 'backend\\wms-control.js'], { cwd: WD, encoding: 'utf8', stdio: 'pipe' });
console.log('STDOUT:\n' + (r4.stdout || '(empty)'));
if (r4.stderr) console.log('STDERR:\n' + r4.stderr);
console.log('EXIT CODE: ' + r4.status);

console.log('\n=== STEP 5: Status --port 65530 (expect 1) ===\n');
const r5 = spawnSync('node', ['backend\\wms-control.js', 'status', '--port', '65530'], { cwd: WD, encoding: 'utf8', stdio: 'pipe' });
console.log('STDOUT:\n' + (r5.stdout || '(empty)'));
if (r5.stderr) console.log('STDERR:\n' + r5.stderr);
console.log('EXIT CODE: ' + r5.status);

console.log('\n=== SUMMARY ===\n');
console.log('Test 2 (no args): Exit ' + r2.status + ' (expected 64)');
console.log('Test 3 (port 3000): Exit ' + r3.status + ' (expected 0/1/2)');
console.log('Test 4 (syntax): Exit ' + r4.status + ' (expected 0)');
console.log('Test 5 (port 65530): Exit ' + r5.status + ' (expected 1)');
