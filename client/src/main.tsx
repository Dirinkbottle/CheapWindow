import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AnimationApp } from './AnimationApp'

/**
 * 引导程序 - 根据配置选择单根或双根模式
 */
async function bootstrap() {
  try {
    // 获取系统配置
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    const response = await fetch(`${socketUrl}/api/settings`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to load settings');
    }

    const settings = data.data;
    const isDualRoot = settings.enable_dual_root === '1';

    console.log('========================================');
    console.log('🚀 [启动模式] ' + (isDualRoot ? '双根渲染模式' : '单根渲染模式'));
    console.log('========================================');

    if (isDualRoot) {
      // 双根模式：创建两个独立的 React 根
      renderDualRoot(settings);
    } else {
      // 单根模式：使用原有逻辑（当前行为）
      renderSingleRoot(settings);
    }
  } catch (error) {
    console.error('❌ [启动失败] 无法加载配置，回退到单根模式:', error);
    // 降级：使用单根模式
    renderSingleRoot(null);
  }
}

/**
 * 单根模式渲染（当前逻辑，完全保留）
 */
function renderSingleRoot(settings: any) {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found');
    return;
  }

  console.log('✓ [单根模式] 渲染到 #root');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App isDualRootMode={false} initialSettings={settings} />
    </React.StrictMode>
  );
}

/**
 * 双根模式渲染
 */
function renderDualRoot(settings: any) {
  const mainElement = document.getElementById('root-main');
  const animationElement = document.getElementById('root-animation');

  if (!mainElement || !animationElement) {
    console.error('❌ [双根模式] 未找到必需的 DOM 元素，回退到单根模式');
    renderSingleRoot(settings);
    return;
  }

  // 隐藏单根模式的 root 元素
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.style.display = 'none';
  }

  try {
    console.log('✓ [双根模式] 渲染主应用到 #root-main');
    const mainRoot = ReactDOM.createRoot(mainElement);
    mainRoot.render(
      <React.StrictMode>
        <App isDualRootMode={true} initialSettings={settings} />
      </React.StrictMode>
    );

    console.log('✓ [双根模式] 渲染动画应用到 #root-animation');
    const animationRoot = ReactDOM.createRoot(animationElement);
    animationRoot.render(
      <React.StrictMode>
        <AnimationApp socketUrl={import.meta.env.VITE_SOCKET_URL} />
      </React.StrictMode>
    );

    console.log('✅ [双根模式] 两个应用启动成功');
  } catch (error) {
    console.error('❌ [双根模式] 启动失败，回退到单根模式:', error);
    renderSingleRoot(settings);
  }
}

// 启动应用
bootstrap();

