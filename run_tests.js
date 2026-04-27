#!/usr/bin/env node
/**
 * Test runner for WMS control script
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const cwd = 'e:\\warehouse-management-system';

console.log('=== WMS CONTROL SCRIPT TEST SUITE ===\n');

// STEP 1: Clean temp files
console.log('=== STEP 1: Cleaning up temporary files ===');
const tempFiles = [
  'e:\\warehouse-management-system\\start.bat.new',
  'e:\\warehouse-management-system\\stop.bat.new',
  'e:\\warehouse-management-system\\dev.bat.new'
];

for (const file of tempFiles) {
  if (fs.existsSync(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`✓ Deleted: ${file}`);
    } catch (e) {
      console.log(`✗ Failed to delete: ${file} (${e.message})`);
    }
  } else {
    console.log(`✓ Not found (skipped): ${file}`);
  }
}
console.log('');

// STEP 2: Run without args
console.log('=== STEP 2: Run without args (should show usage, exit 64) ===');
try {
  const result = spawnSync('node', ['backend\\wms-control.js'], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('STDOUT:', result.stdout || '(empty)');
  console.log('STDERR:', result.stderr || '(empty)');
  console.log('Exit code:', result.status);
  console.log('Expected: 64');
  console.log('Match:', result.status === 64 ? '✓ PASS' : '✗ FAIL');
} catch (e) {
  console.error('Error:', e.message);
}
console.log('');

// STEP 3: Status on port 3000
console.log('=== STEP 3: Status check on port 3000 ===');
try {
  const result = spawnSync('node', ['backend\\wms-control.js', 'status', '--port', '3000'], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('STDOUT:', result.stdout || '(empty)');
  console.log('STDERR:', result.stderr || '(empty)');
  console.log('Exit code:', result.status);
  console.log('Expected: 0, 1, or 2 (depending on port status)');
  console.log('Match:', [0, 1, 2].includes(result.status) ? '✓ PASS' : '✗ FAIL');
} catch (e) {
  console.error('Error:', e.message);
}
console.log('');

// STEP 4: Syntax check
console.log('=== STEP 4: Syntax check (node --check) ===');
try {
  const result = spawnSync('node', ['--check', 'backend\\wms-control.js'], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('STDOUT:', result.stdout || '(empty)');
  console.log('STDERR:', result.stderr || '(empty)');
  console.log('Exit code:', result.status);
  console.log('Expected: 0');
  console.log('Match:', result.status === 0 ? '✓ PASS' : '✗ FAIL');
} catch (e) {
  console.error('Error:', e.message);
}
console.log('');

// STEP 5: Status on free port 65530
console.log('=== STEP 5: Status check on port 65530 (free port) ===');
try {
  const result = spawnSync('node', ['backend\\wms-control.js', 'status', '--port', '65530'], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('STDOUT:', result.stdout || '(empty)');
  console.log('STDERR:', result.stderr || '(empty)');
  console.log('Exit code:', result.status);
  console.log('Expected: 1 (free port)');
  console.log('Match:', result.status === 1 ? '✓ PASS' : '✗ FAIL');
} catch (e) {
  console.error('Error:', e.message);
}

console.log('\n=== TEST COMPLETE ===');
