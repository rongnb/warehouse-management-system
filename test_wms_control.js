#!/usr/bin/env node
/**
 * Comprehensive WMS control script test runner
 * This script tests all functionality of wms-control.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WD = 'e:\\warehouse-management-system';
const SCRIPT = 'backend\\wms-control.js';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, msg) {
  console.log(colors[color] + msg + colors.reset);
}

function pass(test, got, expected) {
  const match = got === expected;
  const status = match ? colors.green + '✓ PASS' : colors.red + '✗ FAIL';
  console.log(`${status}${colors.reset} - ${test} (got: ${got}, expected: ${expected})`);
}

function run(name, args, expectedExitCode) {
  log('bright', `\n>>> ${name}`);
  const result = spawnSync('node', [SCRIPT, ...args], {
    cwd: WD,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 10000
  });

  console.log('STDOUT:', result.stdout ? result.stdout.trim() : '(empty)');
  if (result.stderr) console.log('STDERR:', result.stderr.trim());
  console.log(`Exit Code: ${result.status}`);

  if (expectedExitCode !== null) {
    if (typeof expectedExitCode === 'number') {
      pass(name, result.status, expectedExitCode);
    } else if (Array.isArray(expectedExitCode)) {
      const match = expectedExitCode.includes(result.status);
      const status = match ? colors.green + '✓ PASS' : colors.red + '✗ FAIL';
      console.log(`${status}${colors.reset} - Exit code in ${JSON.stringify(expectedExitCode)}: ${result.status}`);
    }
  }

  return result;
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

log('cyan', '\n╔═══════════════════════════════════════════════════════════╗');
log('cyan', '║     WMS CONTROL SCRIPT TEST SUITE                         ║');
log('cyan', '╚═══════════════════════════════════════════════════════════╝\n');

// STEP 1: Clean temporary files
log('bright', '═══ STEP 1: Clean Temporary Files ═══\n');

const tempFiles = [
  path.join(WD, 'start.bat.new'),
  path.join(WD, 'stop.bat.new'),
  path.join(WD, 'dev.bat.new')
];

for (const file of tempFiles) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      log('green', `✓ Deleted: ${path.basename(file)}`);
    } else {
      console.log(`✓ Not found (skipped): ${path.basename(file)}`);
    }
  } catch (e) {
    log('red', `✗ Failed to delete ${path.basename(file)}: ${e.message}`);
  }
}

// STEP 2: No args - should show usage and exit with 64
log('bright', '\n═══ STEP 2: No Arguments (Usage + Exit 64) ═══');
run('wms-control.js (no args)', [], 64);

// STEP 3: Status check on port 3000
log('bright', '\n═══ STEP 3: Status on Port 3000 ═══');
run('wms-control.js status --port 3000', ['status', '--port', '3000'], [0, 1, 2]);

// STEP 4: Syntax validation
log('bright', '\n═══ STEP 4: Syntax Check (node --check) ═══');
const syntaxResult = spawnSync('node', ['--check', SCRIPT], {
  cwd: WD,
  encoding: 'utf8',
  stdio: 'pipe'
});
console.log('STDOUT:', syntaxResult.stdout ? syntaxResult.stdout.trim() : '(empty)');
if (syntaxResult.stderr) console.log('STDERR:', syntaxResult.stderr.trim());
console.log(`Exit Code: ${syntaxResult.status}`);
pass('Syntax Check', syntaxResult.status, 0);

// STEP 5: Status on free port 65530
log('bright', '\n═══ STEP 5: Status on Free Port 65530 ═══');
run('wms-control.js status --port 65530', ['status', '--port', '65530'], 1);

// Final summary
log('cyan', '\n╔═══════════════════════════════════════════════════════════╗');
log('cyan', '║     TEST SUITE COMPLETE                                   ║');
log('cyan', '╚═══════════════════════════════════════════════════════════╝\n');

log('yellow', 'Summary:');
console.log('- Test 2 (no args): Expected exit code 64');
console.log('- Test 3 (port 3000): Expected exit code 0, 1, or 2');
console.log('- Test 4 (syntax): Expected exit code 0');
console.log('- Test 5 (port 65530): Expected exit code 1');
