#!/usr/bin/env node
/**
 * WMS Control Script Test and Cleanup
 * 
 * This script:
 * 1. Deletes temporary .bat.new files
 * 2. Runs syntax validation
 * 3. Tests the wms-control.js script
 * 4. Reports all results
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_DIR = path.dirname(__filename);
const BACKEND_DIR = path.join(PROJECT_DIR, 'backend');
const WMS_SCRIPT = path.join(BACKEND_DIR, 'wms-control.js');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  WMS CONTROL SCRIPT TEST & CLEANUP SUITE                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ─────────────────────────────────────────────────────────────────────────
// STEP 1: DELETE TEMPORARY FILES
// ─────────────────────────────────────────────────────────────────────────
console.log('📋 STEP 1: CLEANING TEMPORARY FILES\n');

const tempFiles = [
  path.join(PROJECT_DIR, 'start.bat.new'),
  path.join(PROJECT_DIR, 'stop.bat.new'),
  path.join(PROJECT_DIR, 'dev.bat.new')
];

const deletionResults = [];

for (const filePath of tempFiles) {
  const fileName = path.basename(filePath);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`  ✓ DELETED: ${fileName}`);
      deletionResults.push({ file: fileName, status: 'deleted' });
    } else {
      console.log(`  • NOT FOUND: ${fileName}`);
      deletionResults.push({ file: fileName, status: 'not_found' });
    }
  } catch (error) {
    console.log(`  ✗ ERROR deleting ${fileName}: ${error.message}`);
    deletionResults.push({ file: fileName, status: 'error', error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: RUN WITHOUT ARGUMENTS
// ─────────────────────────────────────────────────────────────────────────
console.log('\n📋 STEP 2: TEST NO ARGUMENTS (EXPECT EXIT 64)\n');

const test2 = spawnSync('node', [WMS_SCRIPT], {
  cwd: BACKEND_DIR,
  encoding: 'utf8',
  stdio: 'pipe',
  timeout: 5000
});

console.log('  STDOUT:');
if (test2.stdout) {
  test2.stdout.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
} else {
  console.log('    (empty)');
}

if (test2.stderr) {
  console.log('  STDERR:');
  test2.stderr.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
}

console.log(`  EXIT CODE: ${test2.status}`);
console.log(`  STATUS: ${test2.status === 64 ? '✓ PASS' : '✗ FAIL'} (expected 64)`);

// ─────────────────────────────────────────────────────────────────────────
// STEP 3: STATUS CHECK ON PORT 3000
// ─────────────────────────────────────────────────────────────────────────
console.log('\n📋 STEP 3: STATUS CHECK ON PORT 3000 (EXPECT 0/1/2)\n');

const test3 = spawnSync('node', [WMS_SCRIPT, 'status', '--port', '3000'], {
  cwd: BACKEND_DIR,
  encoding: 'utf8',
  stdio: 'pipe',
  timeout: 5000
});

console.log('  STDOUT:');
if (test3.stdout) {
  test3.stdout.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
} else {
  console.log('    (empty)');
}

if (test3.stderr) {
  console.log('  STDERR:');
  test3.stderr.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
}

const validExitCodes3 = [0, 1, 2];
console.log(`  EXIT CODE: ${test3.status}`);
console.log(`  STATUS: ${validExitCodes3.includes(test3.status) ? '✓ PASS' : '✗ FAIL'} (expected one of: ${validExitCodes3.join(',')})`);

// ─────────────────────────────────────────────────────────────────────────
// STEP 4: SYNTAX VALIDATION
// ─────────────────────────────────────────────────────────────────────────
console.log('\n📋 STEP 4: SYNTAX VALIDATION (node --check)\n');

const test4 = spawnSync('node', ['--check', WMS_SCRIPT], {
  cwd: BACKEND_DIR,
  encoding: 'utf8',
  stdio: 'pipe',
  timeout: 5000
});

console.log('  STDOUT:');
if (test4.stdout) {
  test4.stdout.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
} else {
  console.log('    (empty - success)');
}

if (test4.stderr) {
  console.log('  STDERR:');
  test4.stderr.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
}

console.log(`  EXIT CODE: ${test4.status}`);
console.log(`  STATUS: ${test4.status === 0 ? '✓ PASS' : '✗ FAIL'} (expected 0)`);

// ─────────────────────────────────────────────────────────────────────────
// STEP 5: STATUS CHECK ON FREE PORT 65530
// ─────────────────────────────────────────────────────────────────────────
console.log('\n📋 STEP 5: STATUS CHECK ON FREE PORT 65530 (EXPECT EXIT 1)\n');

const test5 = spawnSync('node', [WMS_SCRIPT, 'status', '--port', '65530'], {
  cwd: BACKEND_DIR,
  encoding: 'utf8',
  stdio: 'pipe',
  timeout: 5000
});

console.log('  STDOUT:');
if (test5.stdout) {
  test5.stdout.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
} else {
  console.log('    (empty)');
}

if (test5.stderr) {
  console.log('  STDERR:');
  test5.stderr.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
}

console.log(`  EXIT CODE: ${test5.status}`);
console.log(`  STATUS: ${test5.status === 1 ? '✓ PASS' : '✗ FAIL'} (expected 1)`);

// ─────────────────────────────────────────────────────────────────────────
// FINAL SUMMARY
// ─────────────────────────────────────────────────────────────────────────
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  TEST SUMMARY                                              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const results = [
  {
    step: '1 - File Cleanup',
    status: deletionResults.every(r => r.status !== 'error') ? 'PASS' : 'FAIL',
    details: deletionResults.map(r => `${r.file}: ${r.status}`).join(', ')
  },
  {
    step: '2 - No Arguments',
    status: test2.status === 64 ? 'PASS' : 'FAIL',
    details: `Exit code: ${test2.status} (expected 64)`
  },
  {
    step: '3 - Port 3000 Status',
    status: [0, 1, 2].includes(test3.status) ? 'PASS' : 'FAIL',
    details: `Exit code: ${test3.status} (expected 0, 1, or 2)`
  },
  {
    step: '4 - Syntax Check',
    status: test4.status === 0 ? 'PASS' : 'FAIL',
    details: `Exit code: ${test4.status} (expected 0)`
  },
  {
    step: '5 - Free Port 65530',
    status: test5.status === 1 ? 'PASS' : 'FAIL',
    details: `Exit code: ${test5.status} (expected 1)`
  }
];

results.forEach((r, i) => {
  const icon = r.status === 'PASS' ? '✓' : '✗';
  console.log(`${icon} Test ${i + 1}: ${r.step}`);
  console.log(`  Status: ${r.status}`);
  console.log(`  Details: ${r.details}\n`);
});

const allPassed = results.every(r => r.status === 'PASS');
console.log(`\n${ allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}\n`);

process.exit(allPassed ? 0 : 1);
