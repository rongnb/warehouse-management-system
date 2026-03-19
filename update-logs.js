const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend/routes');
const files = fs.readdirSync(routesDir);

console.log('开始更新路由文件中的日志...\n');

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // 添加 logger 引用（如果还没有的话）
    if (!content.includes("const logger = require('../utils/logger')")) {
      // 找到其他 require 语句后添加
      const requireLines = content.match(/^const .* = require.*$/gm);
      if (requireLines) {
        const lastRequire = requireLines[requireLines.length - 1];
        content = content.replace(lastRequire, `${lastRequire}\nconst logger = require('../utils/logger');`);
        updated = true;
      }
    }

    // 替换 console.log 为 logger.info
    const oldLogCount = (content.match(/console\.log\(/g) || []).length;
    content = content.replace(/console\.log\(/g, 'logger.info(');
    if (oldLogCount > 0) updated = true;

    // 替换 console.error 为 logger.error
    const oldErrorCount = (content.match(/console\.error\(/g) || []).length;
    content = content.replace(/console\.error\(/g, 'logger.error(');
    if (oldErrorCount > 0) updated = true;

    // 替换 console.warn 为 logger.warn
    const oldWarnCount = (content.match(/console\.warn\(/g) || []).length;
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    if (oldWarnCount > 0) updated = true;

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ 更新: ${file}`);
      if (oldLogCount > 0) console.log(`  - console.log → logger.info (${oldLogCount}处)`);
      if (oldErrorCount > 0) console.log(`  - console.error → logger.error (${oldErrorCount}处)`);
      if (oldWarnCount > 0) console.log(`  - console.warn → logger.warn (${oldWarnCount}处)`);
      console.log('');
    } else {
      console.log(`✓ ${file} 无需更新`);
    }
  }
});

console.log('日志更新完成！');
