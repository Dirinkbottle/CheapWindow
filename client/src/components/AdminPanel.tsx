/**
 * 管理后台组件
 * 管理励志话语和系统配置
 */
import React, { useState, useEffect } from 'react';
import type { Message, Settings } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const AdminPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'settings'>('messages');
  const [loading, setLoading] = useState(false);

  // 新话语表单
  const [newMessage, setNewMessage] = useState({
    content: '',
    bg_color: '#FFE4E1',
    text_color: '#333333'
  });

  // 编辑话语
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    content: '',
    bg_color: '',
    text_color: ''
  });

  // 加载话语列表
  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('加载话语失败:', error);
      alert('加载话语失败');
    }
  };

  // 加载配置
  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/settings`);
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('加载配置失败');
    }
  };

  useEffect(() => {
    loadMessages();
    loadSettings();
  }, []);

  // 添加话语
  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim()) {
      alert('请输入话语内容');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage)
      });
      const data = await response.json();
      
      if (data.success) {
        setNewMessage({ content: '', bg_color: '#FFE4E1', text_color: '#333333' });
        await loadMessages();
        alert('添加成功！');
      } else {
        alert('添加失败: ' + data.message);
      }
    } catch (error) {
      console.error('添加话语失败:', error);
      alert('添加话语失败');
    }
    setLoading(false);
  };

  // 开始编辑
  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditForm({
      content: msg.content,
      bg_color: msg.bg_color,
      text_color: msg.text_color
    });
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/messages/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      
      if (data.success) {
        setEditingId(null);
        await loadMessages();
        alert('更新成功！');
      } else {
        alert('更新失败: ' + data.message);
      }
    } catch (error) {
      console.error('更新话语失败:', error);
      alert('更新话语失败');
    }
    setLoading(false);
  };

  // 删除话语
  const deleteMessage = async (id: number) => {
    if (!confirm('确定要删除这条话语吗？')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/messages/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await loadMessages();
        alert('删除成功！');
      } else {
        alert('删除失败: ' + data.message);
      }
    } catch (error) {
      console.error('删除话语失败:', error);
      alert('删除话语失败');
    }
    setLoading(false);
  };

  // 保存配置
  const saveSettings = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      
      if (data.success) {
        alert('配置已保存！将在下次生成窗口时生效。');
      } else {
        alert('保存失败: ' + data.message);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    }
    setLoading(false);
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🌟 励志弹窗管理后台</h1>
        <div className="tabs">
          <button
            className={activeTab === 'messages' ? 'active' : ''}
            onClick={() => setActiveTab('messages')}
          >
            励志话语管理
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            系统配置
          </button>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === 'messages' && (
          <div className="messages-section">
            {/* 添加新话语 */}
            <div className="add-form">
              <h2>添加新话语</h2>
              <form onSubmit={handleAddMessage}>
                <div className="form-group">
                  <label>话语内容：</label>
                  <input
                    type="text"
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    placeholder="输入励志话语..."
                    maxLength={100}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>背景颜色：</label>
                    <input
                      type="color"
                      value={newMessage.bg_color}
                      onChange={(e) => setNewMessage({ ...newMessage, bg_color: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>文字颜色：</label>
                    <input
                      type="color"
                      value={newMessage.text_color}
                      onChange={(e) => setNewMessage({ ...newMessage, text_color: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}>添加话语</button>
              </form>
            </div>

            {/* 话语列表 */}
            <div className="messages-list">
              <h2>话语列表 ({messages.length} 条)</h2>
              <div className="list-container">
                {messages.map(msg => (
                  <div key={msg.id} className="message-item">
                    {editingId === msg.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          value={editForm.content}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        />
                        <input
                          type="color"
                          value={editForm.bg_color}
                          onChange={(e) => setEditForm({ ...editForm, bg_color: e.target.value })}
                        />
                        <input
                          type="color"
                          value={editForm.text_color}
                          onChange={(e) => setEditForm({ ...editForm, text_color: e.target.value })}
                        />
                        <button onClick={saveEdit}>保存</button>
                        <button onClick={() => setEditingId(null)}>取消</button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="message-preview"
                          style={{
                            backgroundColor: msg.bg_color,
                            color: msg.text_color
                          }}
                        >
                          {msg.content}
                        </div>
                        <div className="message-actions">
                          <button onClick={() => startEdit(msg)}>编辑</button>
                          <button onClick={() => deleteMessage(msg.id)} className="delete">删除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="settings-section">
            <h2>系统配置</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>最大窗口数：</label>
                <input
                  type="number"
                  value={settings.max_windows}
                  onChange={(e) => setSettings({ ...settings, max_windows: e.target.value })}
                  min="1"
                  max="100"
                />
                <span className="hint">同时显示的最大窗口数量</span>
              </div>

              <div className="form-group">
                <label>生成间隔（秒）：</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.interval}
                  onChange={(e) => setSettings({ ...settings, interval: e.target.value })}
                  min="0.1"
                  max="10"
                />
                <span className="hint">窗口生成的时间间隔</span>
              </div>

              <div className="form-group">
                <label>每批数量：</label>
                <input
                  type="number"
                  value={settings.batch_count}
                  onChange={(e) => setSettings({ ...settings, batch_count: e.target.value })}
                  min="1"
                  max="20"
                />
                <span className="hint">每次生成的窗口数量</span>
              </div>

              <div className="form-group">
                <label>字体大小：</label>
                <input
                  type="number"
                  value={settings.font_size}
                  onChange={(e) => setSettings({ ...settings, font_size: e.target.value })}
                  min="10"
                  max="32"
                />
                <span className="hint">基准字体大小（像素）</span>
              </div>

              <div className="form-group">
                <label>浮动范围（像素）：</label>
                <input
                  type="number"
                  value={settings.float_range}
                  onChange={(e) => setSettings({ ...settings, float_range: e.target.value })}
                  min="0"
                  max="20"
                />
                <span className="hint">窗口浮动动画的偏移范围</span>
              </div>

              <button onClick={saveSettings} disabled={loading} className="save-btn">
                保存配置
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-panel {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Microsoft YaHei', sans-serif;
        }

        .admin-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
        }

        .admin-header h1 {
          margin: 0 0 20px 0;
          font-size: 28px;
        }

        .tabs {
          display: flex;
          gap: 10px;
        }

        .tabs button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }

        .tabs button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .tabs button.active {
          background: white;
          color: #667eea;
          font-weight: bold;
        }

        .admin-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        }

        .add-form, .settings-form {
          background: #f8f9fa;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 30px;
        }

        .add-form h2, .settings-section h2 {
          margin-top: 0;
          color: #333;
          font-size: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #555;
        }

        .form-group input[type="text"],
        .form-group input[type="number"] {
          width: 100%;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input[type="color"] {
          width: 60px;
          height: 40px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .form-row {
          display: flex;
          gap: 20px;
        }

        .form-row .form-group {
          flex: 1;
        }

        .hint {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: #888;
        }

        button {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s;
        }

        button:hover {
          background: #5568d3;
          transform: translateY(-1px);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        button.delete {
          background: #ff4444;
        }

        button.delete:hover {
          background: #cc0000;
        }

        .save-btn {
          padding: 12px 30px;
          font-size: 16px;
        }

        .messages-list h2 {
          margin-bottom: 20px;
        }

        .list-container {
          max-height: 600px;
          overflow-y: auto;
        }

        .message-item {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .message-preview {
          flex: 1;
          padding: 12px 20px;
          border-radius: 6px;
          font-weight: 500;
          margin-right: 15px;
        }

        .message-actions {
          display: flex;
          gap: 10px;
        }

        .message-actions button {
          padding: 8px 15px;
          font-size: 13px;
        }

        .edit-form {
          display: flex;
          gap: 10px;
          width: 100%;
          align-items: center;
        }

        .edit-form input[type="text"] {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

