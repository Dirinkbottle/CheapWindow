#!/usr/bin/env node
/**
 * 统一语法检查脚本
 * 用于验证前端TypeScript和后端ES模块的语法
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(text) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(text, 'cyan'));
  console.log('='.repeat(60));
}

function printSuccess(text) {
  console.log(colorize('✓ ' + text, 'green'));
}

function printError(text) {
  console.log(colorize('✗ ' + text, 'red'));
}

function printInfo(text) {
  console.log(colorize('ℹ ' + text, 'blue'));
}

/**
 * 运行命令并返回结果
 */
function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });

    proc.on('error', (error) => {
      resolve({
        code: 1,
        stdout: '',
        stderr: error.message
      });
    });
  });
}

/**
 * 检查服务器端文件
 */
async function checkServerFiles() {
  printHeader('检查服务器端文件 (ES Modules)');

  const serverFiles = [
    'server/src/index.js',
    'server/src/db.js',
    'server/src/physicsEngine.js',
    'server/src/windowManager.js',
    'server/src/wallManager.js',
    'server/src/batchProcessor.js',
    'server/src/performanceMonitor.js',
    'server/src/models/Message.js'
  ];

  let allPassed = true;
  let passedCount = 0;
  let failedCount = 0;

  for (const file of serverFiles) {
    const filePath = join(__dirname, file);
    try {
      // 尝试导入模块
      await import(`file://${filePath}`);
      printSuccess(file);
      passedCount++;
    } catch (error) {
      printError(file);
      console.log(`  ${colorize('Error:', 'red')} ${error.message}`);
      failedCount++;
      allPassed = false;
    }
  }

  console.log('');
  console.log(`${colorize('服务器端检查完成:', 'cyan')} ${passedCount} 通过, ${failedCount} 失败`);

  return allPassed;
}

/**
 * 检查客户端TypeScript文件
 */
async function checkClientFiles() {
  printHeader('检查客户端文件 (TypeScript)');

  const clientPath = join(__dirname, 'client');

  printInfo('运行 TypeScript 编译器...');
  
  const result = await runCommand('npx', ['tsc', '--noEmit'], clientPath);

  if (result.code === 0) {
    printSuccess('客户端 TypeScript 检查通过');
    return true;
  } else {
    printError('客户端 TypeScript 检查失败');
    console.log('\n' + colorize('错误详情:', 'red'));
    console.log(result.stdout);
    if (result.stderr) {
      console.log(result.stderr);
    }
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(colorize('\n🔍 统一语法检查系统', 'magenta'));
  console.log(colorize('检查前端TypeScript和后端ES模块\n', 'magenta'));

  const startTime = Date.now();

  // 检查服务器端
  const serverPassed = await checkServerFiles();

  // 检查客户端
  const clientPassed = await checkClientFiles();

  // 总结
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  printHeader('检查总结');
  console.log(`${colorize('服务器端:', 'cyan')} ${serverPassed ? colorize('✓ 通过', 'green') : colorize('✗ 失败', 'red')}`);
  console.log(`${colorize('客户端:', 'cyan')} ${clientPassed ? colorize('✓ 通过', 'green') : colorize('✗ 失败', 'red')}`);
  console.log(`${colorize('总耗时:', 'cyan')} ${duration}秒`);
  console.log('='.repeat(60) + '\n');

  if (serverPassed && clientPassed) {
    console.log(colorize('✅ 所有检查通过！', 'green'));
    process.exit(0);
  } else {
    console.log(colorize('❌ 检查失败，请修复上述错误', 'red'));
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colorize('未处理的错误:', 'red'), error);
  process.exit(1);
});

// 运行
main();

