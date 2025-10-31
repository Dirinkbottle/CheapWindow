/**
 * 管理后台组件
 * 管理励志话语和系统配置
 */
import React, { useState, useEffect } from 'react';
import type { Message, Settings } from '../types';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

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

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />
              <h3 style={{ marginBottom: '20px', color: '#667eea' }}>高级配置</h3>

              <div className="form-group">
                <label>生成模式：</label>
                <select
                  value={settings.generation_mode}
                  onChange={(e) => setSettings({ ...settings, generation_mode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="auto">自动生成</option>
                  <option value="manual">手动生成</option>
                </select>
                <span className="hint">自动模式会持续生成窗口，手动模式需要触发生成</span>
              </div>

              <div className="form-group">
                <label>窗口最小存活时间（秒）：</label>
                <input
                  type="number"
                  value={settings.min_window_lifetime}
                  onChange={(e) => setSettings({ ...settings, min_window_lifetime: e.target.value })}
                  min="5"
                  max="300"
                />
                <span className="hint">窗口至少存在多久才会被自动清理</span>
              </div>

              <div className="form-group">
                <label>窗口最大存活时间（秒）：</label>
                <input
                  type="number"
                  value={settings.max_window_lifetime}
                  onChange={(e) => setSettings({ ...settings, max_window_lifetime: e.target.value })}
                  min="10"
                  max="600"
                />
                <span className="hint">窗口最多存在多久后会被自动清理</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enable_auto_cleanup === '1'}
                    onChange={(e) => setSettings({ ...settings, enable_auto_cleanup: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  启用自动清理旧窗口
                </label>
                <span className="hint">自动清理超过存活时间的窗口，防止堆积</span>
              </div>

              <div className="form-group">
                <label>基础撕裂时间（毫秒）：</label>
                <input
                  type="number"
                  value={settings.tear_base_duration}
                  onChange={(e) => setSettings({ ...settings, tear_base_duration: e.target.value })}
                  min="1000"
                  max="10000"
                  step="500"
                />
                <span className="hint">多人抢夺时，窗口撕裂的基础时间（实际时间会根据人数调整）</span>
              </div>

              <div className="form-group">
                <label>抖动强度倍数：</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.shake_intensity_multiplier}
                  onChange={(e) => setSettings({ ...settings, shake_intensity_multiplier: e.target.value })}
                  min="0.5"
                  max="5"
                />
                <span className="hint">抢夺时窗口抖动的强度系数</span>
              </div>

              <div className="form-group">
                <label>撕裂动画时长（毫秒）：</label>
                <input
                  type="number"
                  value={settings.tear_animation_duration}
                  onChange={(e) => setSettings({ ...settings, tear_animation_duration: e.target.value })}
                  min="500"
                  max="5000"
                  step="100"
                />
                <span className="hint">窗口撕裂动画的播放时长</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />
              <h3 style={{ marginBottom: '20px', color: '#667eea' }}>⚡ 性能优化配置</h3>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>
                  🖥️ 客户端渲染优化
                </label>
                
                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enable_gpu_acceleration === '1'}
                      onChange={(e) => setSettings({ ...settings, enable_gpu_acceleration: e.target.checked ? '1' : '0' })}
                      style={{ marginRight: '10px' }}
                    />
                    启用 GPU 硬件加速
                  </label>
                  <span className="hint">使用 transform3d 提升动画流畅度（推荐开启）</span>
                </div>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.enable_batch_rendering === '1'}
                      onChange={(e) => setSettings({ ...settings, enable_batch_rendering: e.target.checked ? '1' : '0' })}
                      style={{ marginRight: '10px' }}
                    />
                    启用批量渲染优化
                  </label>
                  <span className="hint">合并多个更新为一次渲染，大幅提升性能（推荐开启）</span>
                </div>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.disable_float_animation_mobile === '1'}
                      onChange={(e) => setSettings({ ...settings, disable_float_animation_mobile: e.target.checked ? '1' : '0' })}
                      style={{ marginRight: '10px' }}
                    />
                    移动端禁用浮动动画
                  </label>
                  <span className="hint">在移动设备上禁用浮动动画，降低 CPU 占用</span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>
                  🚀 服务器更新策略
                </label>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>桌面端物理帧率（FPS）：</label>
                  <input
                    type="number"
                    value={settings.physics_fps}
                    onChange={(e) => setSettings({ ...settings, physics_fps: e.target.value })}
                    min="20"
                    max="120"
                    step="10"
                    style={{ width: '100px', marginLeft: '10px' }}
                  />
                  <span className="hint">桌面设备的物理引擎更新频率（默认 60）</span>
                </div>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>移动端物理帧率（FPS）：</label>
                  <input
                    type="number"
                    value={settings.physics_fps_mobile}
                    onChange={(e) => setSettings({ ...settings, physics_fps_mobile: e.target.value })}
                    min="10"
                    max="60"
                    step="5"
                    style={{ width: '100px', marginLeft: '10px' }}
                  />
                  <span className="hint">移动设备的物理引擎更新频率（默认 30）</span>
                </div>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.broadcast_throttle === '1'}
                      onChange={(e) => setSettings({ ...settings, broadcast_throttle: e.target.checked ? '1' : '0' })}
                      style={{ marginRight: '10px' }}
                    />
                    启用广播节流
                  </label>
                  <span className="hint">合并物理更新广播，减少网络流量</span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>
                  📱 移动端特殊配置
                </label>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.auto_detect_device === '1'}
                      onChange={(e) => setSettings({ ...settings, auto_detect_device: e.target.checked ? '1' : '0' })}
                      style={{ marginRight: '10px' }}
                    />
                    自动检测设备类型
                  </label>
                  <span className="hint">自动识别移动设备并应用专门优化</span>
                </div>

                <div style={{ marginLeft: '20px', marginBottom: '15px' }}>
                  <label>移动端最大窗口数：</label>
                  <input
                    type="number"
                    value={settings.max_windows_mobile}
                    onChange={(e) => setSettings({ ...settings, max_windows_mobile: e.target.value })}
                    min="5"
                    max="50"
                    style={{ width: '100px', marginLeft: '10px' }}
                  />
                  <span className="hint">当移动端用户超过 50% 时的最大窗口数</span>
                </div>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />
              <h3 style={{ marginBottom: '20px', color: '#667eea' }}>🎨 撕裂动画配置</h3>

              <div className="form-group">
                <label>动画风格：</label>
                <select
                  value={settings.tear_animation_style}
                  onChange={(e) => setSettings({ ...settings, tear_animation_style: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '5px'
                  }}
                >
                  <option value="gradual">逐渐破裂 - 裂纹从中心辐射扩散</option>
                  <option value="stretch">拉扯风格 - 沿用户拖动方向撕裂</option>
                  <option value="shatter">粉碎风格 - 蛛网状裂纹瞬间粉碎（默认）</option>
                </select>
                <span className="hint">选择窗口撕裂时的视觉效果</span>
              </div>

              <div className="form-group">
                <label>性能模式：</label>
                <select
                  value={settings.tear_performance_mode}
                  onChange={(e) => setSettings({ ...settings, tear_performance_mode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '5px'
                  }}
                >
                  <option value="high">高质量 - 丰富粒子效果，模糊发光</option>
                  <option value="balanced">平衡 - 适中效果和性能（推荐）</option>
                  <option value="performance">性能优先 - 简化效果，流畅运行</option>
                </select>
                <span className="hint">在视觉效果和性能之间选择平衡点</span>
              </div>

              <div className="form-group">
                <label>裂纹开始时机（倒计时百分比）：</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.tear_crack_start_ratio}
                  onChange={(e) => setSettings({ ...settings, tear_crack_start_ratio: e.target.value })}
                  min="0"
                  max="0.9"
                  style={{ width: '100px', marginLeft: '10px' }}
                />
                <span className="hint">0.33 表示倒计时过了 1/3 后开始生成裂纹</span>
              </div>

              <div className="form-group">
                <label>碎片存在时间（毫秒）：</label>
                <input
                  type="number"
                  value={settings.tear_fragment_lifetime}
                  onChange={(e) => setSettings({ ...settings, tear_fragment_lifetime: e.target.value })}
                  min="1000"
                  max="10000"
                  step="500"
                />
                <span className="hint">碎片从生成到完全消失的时间</span>
              </div>

              <div className="form-group">
                <label>碎片淡出时间（毫秒）：</label>
                <input
                  type="number"
                  value={settings.tear_fragment_fade_duration}
                  onChange={(e) => setSettings({ ...settings, tear_fragment_fade_duration: e.target.value })}
                  min="500"
                  max="3000"
                  step="100"
                />
                <span className="hint">碎片开始淡出到完全透明的时间</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_rotation === '1'}
                    onChange={(e) => setSettings({ ...settings, tear_enable_rotation: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  启用碎片旋转效果
                </label>
                <span className="hint">碎片飞散时会旋转</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_scale === '1'}
                    onChange={(e) => setSettings({ ...settings, tear_enable_scale: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  启用碎片缩放效果
                </label>
                <span className="hint">碎片飞散时会逐渐缩小</span>
              </div>

              <div className="form-group">
                <label>高质量模式粒子数量：</label>
                <input
                  type="number"
                  value={settings.tear_particle_count}
                  onChange={(e) => setSettings({ ...settings, tear_particle_count: e.target.value })}
                  min="0"
                  max="200"
                  step="10"
                />
                <span className="hint">高质量模式下额外生成的粒子效果数量</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_blur === '1'}
                    onChange={(e) => setSettings({ ...settings, tear_enable_blur: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  高质量模式启用模糊效果
                </label>
                <span className="hint">碎片淡出时添加模糊效果</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_glow === '1'}
                    onChange={(e) => setSettings({ ...settings, tear_enable_glow: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  高质量模式启用发光效果
                </label>
                <span className="hint">裂纹边缘添加发光效果</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />
              <h3 style={{ marginBottom: '20px', color: '#667eea' }}>🐛 Debug 配置</h3>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enable_debug_logs === '1'}
                    onChange={(e) => setSettings({ ...settings, enable_debug_logs: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  启用 Debug 日志
                </label>
                <span className="hint">在浏览器控制台输出详细的调试信息（建议生产环境关闭以提升性能）</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />
              <h3 style={{ marginBottom: '20px', color: '#667eea' }}>👁️ UI 显示配置</h3>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.show_contest_indicator === '1'}
                    onChange={(e) => setSettings({ ...settings, show_contest_indicator: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  显示抢夺倒计时 UI
                </label>
                <span className="hint">在窗口上方显示"X 人抢夺中 - Xs"提示</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />
              <h3 style={{ marginBottom: '20px', color: '#667eea' }}>🧱 墙壁系统配置</h3>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enable_wall_system === '1'}
                    onChange={(e) => setSettings({ ...settings, enable_wall_system: e.target.checked ? '1' : '0' })}
                    style={{ marginRight: '10px' }}
                  />
                  启用墙壁系统
                </label>
                <span className="hint">窗口碰到屏幕边缘时会被墙壁主人捕获</span>
              </div>

              <div className="form-group">
                <label>持久化模式</label>
                <select
                  value={settings.wall_persistence_mode || 'mysql'}
                  onChange={(e) => setSettings({ ...settings, wall_persistence_mode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '5px'
                  }}
                >
                  <option value="memory">纯内存模式 - 重启后数据丢失，最快</option>
                  <option value="json">JSON文件模式 - 持久化到本地文件，轻量</option>
                  <option value="mysql">MySQL数据库模式 - 持久化到数据库，可靠</option>
                </select>
                <span className="hint">选择墙壁分配数据的存储方式</span>
              </div>

              <div className="form-group">
                <label>JSON文件路径</label>
                <input
                  type="text"
                  value={settings.wall_json_file_path || 'data/wall_assignments.json'}
                  onChange={(e) => setSettings({ ...settings, wall_json_file_path: e.target.value })}
                />
                <span className="hint">JSON模式下的数据文件路径（相对于服务器根目录）</span>
              </div>

              <div className="form-group">
                <label>写入延迟（毫秒）</label>
                <input
                  type="number"
                  value={settings.mysql_write_delay || '100'}
                  onChange={(e) => setSettings({ ...settings, mysql_write_delay: e.target.value })}
                  min="10"
                  max="1000"
                  step="10"
                />
                <span className="hint">批量写入的延迟时间，降低数据库/文件系统压力</span>
              </div>

              <div className="form-group">
                <label>窗口捕获动画时长（毫秒）</label>
                <input
                  type="number"
                  value={settings.wall_capture_duration}
                  onChange={(e) => setSettings({ ...settings, wall_capture_duration: e.target.value })}
                  min="1000"
                  max="10000"
                  step="100"
                />
                <span className="hint">窗口被捕获后的动画播放时长（1000-10000ms）</span>
              </div>

              <div className="form-group">
                <label>窗口放大倍数</label>
                <input
                  type="number"
                  value={settings.wall_capture_scale}
                  onChange={(e) => setSettings({ ...settings, wall_capture_scale: e.target.value })}
                  min="1"
                  max="10"
                  step="0.1"
                />
                <span className="hint">窗口在捕获动画中的最大放大倍数（1-10）</span>
              </div>

              <div className="form-group">
                <label>背景淡出速度倍数</label>
                <input
                  type="number"
                  value={settings.wall_capture_bg_fade_multiplier}
                  onChange={(e) => setSettings({ ...settings, wall_capture_bg_fade_multiplier: e.target.value })}
                  min="1"
                  max="5"
                  step="0.1"
                />
                <span className="hint">背景淡出时间 = 动画时长 × 此倍数（1-5）</span>
              </div>

              <div className="form-group">
                <label>文字淡出速度倍数</label>
                <input
                  type="number"
                  value={settings.wall_capture_text_fade_multiplier}
                  onChange={(e) => setSettings({ ...settings, wall_capture_text_fade_multiplier: e.target.value })}
                  min="0.5"
                  max="3"
                  step="0.1"
                />
                <span className="hint">文字淡出时间 = 动画时长 × 此倍数（0.5-3）</span>
              </div>

              <div className="form-group">
                <label>移动到中心速度（毫秒）</label>
                <input
                  type="number"
                  value={settings.wall_capture_move_speed}
                  onChange={(e) => setSettings({ ...settings, wall_capture_move_speed: e.target.value })}
                  min="100"
                  max="2000"
                  step="50"
                />
                <span className="hint">窗口从边缘移动到屏幕中心的时间（100-2000ms）</span>
              </div>

              <div className="form-group">
                <label>墙壁边框宽度（像素）</label>
                <input
                  type="number"
                  value={settings.wall_border_width}
                  onChange={(e) => setSettings({ ...settings, wall_border_width: e.target.value })}
                  min="3"
                  max="20"
                />
                <span className="hint">屏幕边缘彩色边框的宽度（3-20px）</span>
              </div>

              <div className="form-group">
                <label>窗口接近高亮阈值（%）</label>
                <input
                  type="number"
                  value={settings.wall_proximity_threshold}
                  onChange={(e) => setSettings({ ...settings, wall_proximity_threshold: e.target.value })}
                  min="5"
                  max="30"
                />
                <span className="hint">窗口距离墙壁多近时墙壁开始高亮（5-30%）</span>
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

