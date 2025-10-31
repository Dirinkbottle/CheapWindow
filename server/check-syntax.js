/**
 * 语法检查脚本
 * 用于验证所有服务器文件的 ES 模块语法
 */
import { readdir } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function checkFile(filePath) {
  try {
    await import(pathToFileURL(filePath).href);
    console.log(`✓ ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ ${filePath}:`);
    console.error(`  ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n')[0]}`);
    }
    return false;
  }
}

console.log('='.repeat(60));
console.log('检查服务器文件语法...');
console.log('='.repeat(60));
console.log('');

// 检查所有服务器文件
const files = [
  'src/index.js',
  'src/db.js',
  'src/physicsEngine.js',
  'src/windowManager.js',
  'src/wallManager.js',
  'src/models/Message.js'
];

let allPassed = true;
let passedCount = 0;
let failedCount = 0;

for (const file of files) {
  const filePath = join(process.cwd(), file);
  const passed = await checkFile(filePath);
  if (passed) {
    passedCount++;
  } else {
    failedCount++;
    allPassed = false;
  }
}

console.log('');
console.log('='.repeat(60));
console.log(`检查完成: ${passedCount} 通过, ${failedCount} 失败`);
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);

