/**
 * 主应用组件
 * 渲染所有同步的弹窗
 */
import { useState } from 'react';
import { PopupWindow } from './components/PopupWindow';
import { AdminPanel } from './components/AdminPanel';
import { WallBorders } from './components/WallBorders';
import { WallCaptureAnimation } from './components/WallCaptureAnimation';
import { useSocket } from './hooks/useSocket';

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const {
    connected,
    windows,
    contestedWindows,
    userVectorsMap,
    settings,
    wallState,
    capturedWindows,
    setCapturedWindows,
    grabWindow,
    dragWindow,
    releaseWindow
  } = useSocket();

  // 如果在管理后台，显示管理界面
  if (showAdmin) {
    return (
      <div>
        <button
          onClick={() => setShowAdmin(false)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          返回主页
        </button>
        <AdminPanel />
      </div>
    );
  }

  return (
    <div className="app">
      {/* 连接状态指示器 */}
      <div className="connection-indicator">
        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {connected ? `在线 · ${windows.size} 个窗口` : '连接中...'}
        </span>
      </div>

      {/* 管理后台按钮 */}
      <button
        className="admin-button"
        onClick={() => setShowAdmin(true)}
        title="管理后台"
      >
        ⚙️
      </button>

      {/* 使用说明（首次访问提示） */}
      {windows.size === 0 && connected && (
        <div className="welcome-message">
          <h1>🌟 欢迎来到励志弹窗世界</h1>
          <p>窗口即将开始生成...</p>
          <p className="hint">你可以抓取、拖动、甩出窗口</p>
          <p className="hint">多人同时抓取会撕裂窗口哦 😄</p>
        </div>
      )}

      {/* 墙壁边框（如果启用） */}
      {settings?.enable_wall_system === '1' && (
        <WallBorders
          wallState={wallState}
          settings={settings}
          windowPositions={Array.from(windows.values()).map(w => w.position)}
        />
      )}

      {/* 渲染所有窗口 */}
      {Array.from(windows.values()).map(window => (
        <PopupWindow
          key={window.id}
          window={window}
          contestData={contestedWindows.get(window.id)}
          userVectors={userVectorsMap.get(window.id)}
          settings={settings}
          onGrab={grabWindow}
          onDrag={dragWindow}
          onRelease={releaseWindow}
        />
      ))}

      {/* 渲染捕获动画（仅墙壁主人看到） */}
      {Array.from(capturedWindows.values()).map(captured => (
        <WallCaptureAnimation
          key={captured.windowId}
          window={captured.window}
          edge={captured.edge}
          settings={settings}
          onComplete={() => {
            // ✅ 动画完成，清理捕获窗口数据
            console.log(`✅ [捕获动画完成] ${captured.windowId.slice(0, 8)}`);
            
            // 从 capturedWindows Map 中删除，防止窗口残留
            setCapturedWindows(prev => {
              const newMap = new Map(prev);
              newMap.delete(captured.windowId);
              console.log(`🗑️ [清理捕获窗口] 已删除: ${captured.windowId.slice(0, 8)}`);
              return newMap;
            });
          }}
        />
      ))}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          width: 100vw;
          height: 100vh;
        }

        .app {
          width: 100vw;
          height: 100vh;
          position: relative;
        }

        /* 连接状态指示器 */
        .connection-indicator {
          position: fixed;
          top: 20px;
          left: 20px;
          background: rgba(255, 255, 255, 0.95);
          padding: 10px 20px;
          border-radius: 25px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 9999;
          font-size: 14px;
          font-weight: 500;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-dot.connected {
          background: #4caf50;
        }

        .status-dot.disconnected {
          background: #ff9800;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .status-text {
          color: #333;
        }

        /* 管理后台按钮 */
        .admin-button {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          font-size: 24px;
          z-index: 9999;
          transition: all 0.3s;
        }

        .admin-button:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        /* 欢迎消息 */
        .welcome-message {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #333;
          z-index: 10;
          animation: fadeIn 1s ease-in;
        }

        .welcome-message h1 {
          font-size: 42px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-message p {
          font-size: 20px;
          margin: 10px 0;
          color: #555;
        }

        .welcome-message .hint {
          font-size: 16px;
          color: #888;
          font-style: italic;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        /* 滚动条样式 */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}

export default App;

