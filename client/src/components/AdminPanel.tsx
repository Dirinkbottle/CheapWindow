/**
 * 管理后台组件
 * 管理励志话语和系统配置
 */
import React, { useState, useEffect } from 'react';
import type { Message, Settings } from '../types';

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

type TabType = 'messages' | 'settings' | 'webgl';

export const AdminPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('messages');
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

  // 更新单个配置字段
  const updateSettingField = (key: string, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  // 折叠/展开状态
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAllSections = (expand: boolean) => {
    const sections = ['crack_ext', 'visual_ext', 'animation_ext', 'texture', 'fragment', 'physics', 'lighting', 'camera', 'performance_ext'];
    const newState: Record<string, boolean> = {};
    sections.forEach(s => newState[s] = expand);
    setExpandedSections(newState);
  };

  // 加载WebGL预设
  const loadWebGLPreset = (preset: 'performance' | 'balanced' | 'quality' | 'extreme') => {
    if (!settings) return;

    const presets = {
      performance: {
        // Existing
        tear_crack_layers: '1',
        tear_crack_density: '0.8',
        tear_crack_glow: '0.3',
        tear_enable_shadow: '0',
        tear_3d_depth: '200',
        tear_3d_rotation_speed: '3',
        tear_camera_fov: '60',
        tear_enable_perspective: '1',
        tear_particle_glass_count: '200',
        tear_particle_sparkle_count: '50',
        tear_particle_smoke_count: '20',
        tear_enable_bloom: '0',
        tear_enable_motion_blur: '0',
        tear_enable_chromatic: '0',
        tear_animation_total_duration: '3000',
        tear_explosion_force: '0.8',
        tear_slow_motion_factor: '1.0',
        tear_texture_resolution: '1x',
        tear_target_fps: '60',
        tear_adaptive_quality: '1',
        // Extended crack
        tear_crack_width_min: '1',
        tear_crack_width_max: '3',
        tear_crack_branch_prob: '0.5',
        // Extended 3D
        tear_camera_distance: '800',
        // Extended particles
        tear_particle_lifetime_mult: '0.8',
        // Visual effects extension
        tear_bloom_threshold: '0.5',
        tear_bloom_intensity: '0.5',
        tear_motion_blur_samples: '3',
        tear_motion_blur_intensity: '0.3',
        tear_chromatic_offset: '1',
        tear_enable_ssao: '0',
        tear_ssao_radius: '10',
        tear_ssao_intensity: '0.3',
        // Animation phases
        tear_phase_cracking_ratio: '0.3',
        tear_phase_preparing_ratio: '0.1',
        tear_phase_explosion_ratio: '0.05',
        tear_phase_flying_ratio: '0.4',
        tear_phase_fading_ratio: '0.15',
        // Texture
        tear_texture_filtering: 'linear',
        tear_enable_mipmaps: '0',
        // Fragment
        tear_fragment_count: '30',
        tear_fragment_thickness: '3',
        tear_voronoi_subdivisions: '2',
        tear_voronoi_perturbation: '10',
        tear_enable_backface: '0',
        // Physics
        tear_gravity: '300',
        tear_air_resistance: '0.02',
        tear_rotation_damping: '0.98',
        tear_initial_speed_mult: '1.0',
        // Lighting
        tear_lighting_intensity: '0.8',
        tear_ambient_light: '0.5',
        tear_directional_light: '0.5',
        tear_light_dir_x: '0.5',
        tear_light_dir_y: '-1',
        tear_light_dir_z: '0.5',
        tear_enable_edge_light: '0',
        tear_edge_light_intensity: '0.5',
        // Camera
        tear_enable_camera_shake: '0',
        tear_camera_shake_intensity: '5',
        tear_camera_shake_duration: '200',
        tear_enable_camera_tracking: '0',
        tear_camera_tracking_smooth: '0.1',
        // Performance
        tear_enable_lod: '1',
        tear_lod_distance_near: '100',
        tear_lod_distance_far: '800',
        tear_enable_culling: '1'
      },
      balanced: {
        // Existing
        tear_crack_layers: '2',
        tear_crack_density: '1.0',
        tear_crack_glow: '0.6',
        tear_enable_shadow: '1',
        tear_3d_depth: '300',
        tear_3d_rotation_speed: '5',
        tear_camera_fov: '75',
        tear_enable_perspective: '1',
        tear_particle_glass_count: '500',
        tear_particle_sparkle_count: '200',
        tear_particle_smoke_count: '50',
        tear_enable_bloom: '1',
        tear_enable_motion_blur: '1',
        tear_enable_chromatic: '1',
        tear_animation_total_duration: '4000',
        tear_explosion_force: '1.0',
        tear_slow_motion_factor: '1.0',
        tear_texture_resolution: '2x',
        tear_target_fps: '60',
        tear_adaptive_quality: '1',
        // Extended crack
        tear_crack_width_min: '2',
        tear_crack_width_max: '5',
        tear_crack_branch_prob: '0.7',
        // Extended 3D
        tear_camera_distance: '1000',
        // Extended particles
        tear_particle_lifetime_mult: '1.0',
        // Visual effects extension
        tear_bloom_threshold: '0.7',
        tear_bloom_intensity: '1.0',
        tear_motion_blur_samples: '6',
        tear_motion_blur_intensity: '0.5',
        tear_chromatic_offset: '2',
        tear_enable_ssao: '1',
        tear_ssao_radius: '15',
        tear_ssao_intensity: '0.5',
        // Animation phases
        tear_phase_cracking_ratio: '0.3',
        tear_phase_preparing_ratio: '0.1',
        tear_phase_explosion_ratio: '0.05',
        tear_phase_flying_ratio: '0.4',
        tear_phase_fading_ratio: '0.15',
        // Texture
        tear_texture_filtering: 'linear',
        tear_enable_mipmaps: '1',
        // Fragment
        tear_fragment_count: '50',
        tear_fragment_thickness: '5',
        tear_voronoi_subdivisions: '3',
        tear_voronoi_perturbation: '15',
        tear_enable_backface: '1',
        // Physics
        tear_gravity: '300',
        tear_air_resistance: '0.02',
        tear_rotation_damping: '0.98',
        tear_initial_speed_mult: '1.0',
        // Lighting
        tear_lighting_intensity: '1.0',
        tear_ambient_light: '0.4',
        tear_directional_light: '0.6',
        tear_light_dir_x: '0.5',
        tear_light_dir_y: '-1',
        tear_light_dir_z: '0.5',
        tear_enable_edge_light: '1',
        tear_edge_light_intensity: '1.0',
        // Camera
        tear_enable_camera_shake: '1',
        tear_camera_shake_intensity: '8',
        tear_camera_shake_duration: '300',
        tear_enable_camera_tracking: '0',
        tear_camera_tracking_smooth: '0.2',
        // Performance
        tear_enable_lod: '1',
        tear_lod_distance_near: '200',
        tear_lod_distance_far: '1200',
        tear_enable_culling: '1'
      },
      quality: {
        // Existing
        tear_crack_layers: '3',
        tear_crack_density: '1.5',
        tear_crack_glow: '0.8',
        tear_enable_shadow: '1',
        tear_3d_depth: '400',
        tear_3d_rotation_speed: '7',
        tear_camera_fov: '90',
        tear_enable_perspective: '1',
        tear_particle_glass_count: '800',
        tear_particle_sparkle_count: '350',
        tear_particle_smoke_count: '80',
        tear_enable_bloom: '1',
        tear_enable_motion_blur: '1',
        tear_enable_chromatic: '1',
        tear_animation_total_duration: '5000',
        tear_explosion_force: '1.3',
        tear_slow_motion_factor: '0.8',
        tear_texture_resolution: '2x',
        tear_target_fps: '60',
        tear_adaptive_quality: '1',
        // Extended crack
        tear_crack_width_min: '3',
        tear_crack_width_max: '7',
        tear_crack_branch_prob: '0.8',
        // Extended 3D
        tear_camera_distance: '1200',
        // Extended particles
        tear_particle_lifetime_mult: '1.5',
        // Visual effects extension
        tear_bloom_threshold: '0.6',
        tear_bloom_intensity: '1.5',
        tear_motion_blur_samples: '10',
        tear_motion_blur_intensity: '0.7',
        tear_chromatic_offset: '3',
        tear_enable_ssao: '1',
        tear_ssao_radius: '18',
        tear_ssao_intensity: '0.7',
        // Animation phases
        tear_phase_cracking_ratio: '0.3',
        tear_phase_preparing_ratio: '0.1',
        tear_phase_explosion_ratio: '0.05',
        tear_phase_flying_ratio: '0.4',
        tear_phase_fading_ratio: '0.15',
        // Texture
        tear_texture_filtering: 'linear',
        tear_enable_mipmaps: '1',
        // Fragment
        tear_fragment_count: '70',
        tear_fragment_thickness: '7',
        tear_voronoi_subdivisions: '4',
        tear_voronoi_perturbation: '25',
        tear_enable_backface: '1',
        // Physics
        tear_gravity: '350',
        tear_air_resistance: '0.015',
        tear_rotation_damping: '0.99',
        tear_initial_speed_mult: '1.5',
        // Lighting
        tear_lighting_intensity: '1.3',
        tear_ambient_light: '0.3',
        tear_directional_light: '0.7',
        tear_light_dir_x: '0.6',
        tear_light_dir_y: '-1',
        tear_light_dir_z: '0.6',
        tear_enable_edge_light: '1',
        tear_edge_light_intensity: '1.5',
        // Camera
        tear_enable_camera_shake: '1',
        tear_camera_shake_intensity: '12',
        tear_camera_shake_duration: '400',
        tear_enable_camera_tracking: '1',
        tear_camera_tracking_smooth: '0.3',
        // Performance
        tear_enable_lod: '0',
        tear_lod_distance_near: '300',
        tear_lod_distance_far: '1500',
        tear_enable_culling: '1'
      },
      extreme: {
        // Existing
        tear_crack_layers: '3',
        tear_crack_density: '2.0',
        tear_crack_glow: '1.0',
        tear_enable_shadow: '1',
        tear_3d_depth: '500',
        tear_3d_rotation_speed: '10',
        tear_camera_fov: '110',
        tear_enable_perspective: '1',
        tear_particle_glass_count: '1000',
        tear_particle_sparkle_count: '500',
        tear_particle_smoke_count: '100',
        tear_enable_bloom: '1',
        tear_enable_motion_blur: '1',
        tear_enable_chromatic: '1',
        tear_animation_total_duration: '6000',
        tear_explosion_force: '2.0',
        tear_slow_motion_factor: '0.6',
        tear_texture_resolution: '4x',
        tear_target_fps: '60',
        tear_adaptive_quality: '0',
        // Extended crack
        tear_crack_width_min: '4',
        tear_crack_width_max: '10',
        tear_crack_branch_prob: '1.0',
        // Extended 3D
        tear_camera_distance: '1500',
        // Extended particles
        tear_particle_lifetime_mult: '2.0',
        // Visual effects extension
        tear_bloom_threshold: '0.5',
        tear_bloom_intensity: '2.5',
        tear_motion_blur_samples: '16',
        tear_motion_blur_intensity: '1.0',
        tear_chromatic_offset: '5',
        tear_enable_ssao: '1',
        tear_ssao_radius: '20',
        tear_ssao_intensity: '0.9',
        // Animation phases
        tear_phase_cracking_ratio: '0.3',
        tear_phase_preparing_ratio: '0.1',
        tear_phase_explosion_ratio: '0.05',
        tear_phase_flying_ratio: '0.4',
        tear_phase_fading_ratio: '0.15',
        // Texture
        tear_texture_filtering: 'linear',
        tear_enable_mipmaps: '1',
        // Fragment
        tear_fragment_count: '100',
        tear_fragment_thickness: '10',
        tear_voronoi_subdivisions: '5',
        tear_voronoi_perturbation: '50',
        tear_enable_backface: '1',
        // Physics
        tear_gravity: '400',
        tear_air_resistance: '0.01',
        tear_rotation_damping: '0.995',
        tear_initial_speed_mult: '2.5',
        // Lighting
        tear_lighting_intensity: '1.8',
        tear_ambient_light: '0.2',
        tear_directional_light: '0.8',
        tear_light_dir_x: '0.7',
        tear_light_dir_y: '-1',
        tear_light_dir_z: '0.7',
        tear_enable_edge_light: '1',
        tear_edge_light_intensity: '2.0',
        // Camera
        tear_enable_camera_shake: '1',
        tear_camera_shake_intensity: '20',
        tear_camera_shake_duration: '600',
        tear_enable_camera_tracking: '1',
        tear_camera_tracking_smooth: '0.5',
        // Performance
        tear_enable_lod: '0',
        tear_lod_distance_near: '0',
        tear_lod_distance_far: '2000',
        tear_enable_culling: '0'
      }
    };

    setSettings({ ...settings, ...presets[preset] });
    alert(`已应用 ${preset} 预设配置！`);
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
          <button
            className={activeTab === 'webgl' ? 'active' : ''}
            onClick={() => setActiveTab('webgl')}
          >
            🎬 WebGL撕裂效果
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

        {activeTab === 'webgl' && settings && (
          <div className="webgl-section">
            <h2>🎬 WebGL 超真实撕裂效果配置</h2>
            <p style={{ marginBottom: '30px', color: '#666', fontSize: '14px' }}>
              配置窗口撕裂时的真实3D效果、裂纹生成、粒子系统等参数。修改后立即生效。
            </p>

            {/* 预设按钮 */}
            <div className="preset-buttons" style={{ marginBottom: '30px' }}>
              <button onClick={() => loadWebGLPreset('performance')} style={{ background: '#2ecc71' }}>
                🚀 性能模式
              </button>
              <button onClick={() => loadWebGLPreset('balanced')} style={{ background: '#3498db' }}>
                ⚖️ 平衡模式
              </button>
              <button onClick={() => loadWebGLPreset('quality')} style={{ background: '#9b59b6' }}>
                💎 质量模式
              </button>
              <button onClick={() => loadWebGLPreset('extreme')} style={{ background: '#e74c3c' }}>
                🔥 极致模式
              </button>
            </div>

            {/* 展开/折叠全部 */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={() => toggleAllSections(true)} style={{ background: '#16a085', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                📂 展开全部高级设置
              </button>
              <button onClick={() => toggleAllSections(false)} style={{ background: '#7f8c8d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                📁 折叠全部高级设置
              </button>
            </div>

            <div className="settings-form">
              {/* 裂纹效果 */}
              <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '18px' }}>💥 裂纹效果</h3>
              
              <div className="form-group">
                <label>裂纹层数：{settings.tear_crack_layers || '2'}</label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="1"
                  value={settings.tear_crack_layers || '2'}
                  onChange={(e) => updateSettingField('tear_crack_layers', e.target.value)}
                />
                <span className="hint">更多层数 = 更复杂的裂纹网络 (1-3)</span>
              </div>

              <div className="form-group">
                <label>裂纹密度：{settings.tear_crack_density || '1.0'}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.tear_crack_density || '1.0'}
                  onChange={(e) => updateSettingField('tear_crack_density', e.target.value)}
                />
                <span className="hint">裂纹生成的密集程度 (0.5-2.0)</span>
              </div>

              <div className="form-group">
                <label>裂纹发光强度：{settings.tear_crack_glow || '0.6'}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.tear_crack_glow || '0.6'}
                  onChange={(e) => updateSettingField('tear_crack_glow', e.target.value)}
                />
                <span className="hint">裂纹边缘的发光效果 (0-1)</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_shadow === '1'}
                    onChange={(e) => updateSettingField('tear_enable_shadow', e.target.checked ? '1' : '0')}
                    style={{ marginRight: '10px' }}
                  />
                  启用裂纹阴影
                </label>
                <span className="hint">在裂纹内部添加深度阴影效果</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 3D效果 */}
              <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '18px' }}>🎭 3D效果</h3>
              
              <div className="form-group">
                <label>3D深度：{settings.tear_3d_depth || '300'}px</label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={settings.tear_3d_depth || '300'}
                  onChange={(e) => updateSettingField('tear_3d_depth', e.target.value)}
                />
                <span className="hint">碎片向屏幕外飞出的距离 (0-500px)</span>
              </div>

              <div className="form-group">
                <label>旋转速度：{settings.tear_3d_rotation_speed || '5'}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={settings.tear_3d_rotation_speed || '5'}
                  onChange={(e) => updateSettingField('tear_3d_rotation_speed', e.target.value)}
                />
                <span className="hint">碎片3D旋转的速度 (0-10)</span>
              </div>

              <div className="form-group">
                <label>相机视角：{settings.tear_camera_fov || '75'}度</label>
                <input
                  type="range"
                  min="30"
                  max="120"
                  step="5"
                  value={settings.tear_camera_fov || '75'}
                  onChange={(e) => updateSettingField('tear_camera_fov', e.target.value)}
                />
                <span className="hint">FOV值越大，透视效果越强 (30-120)</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_perspective !== '0'}
                    onChange={(e) => updateSettingField('tear_enable_perspective', e.target.checked ? '1' : '0')}
                    style={{ marginRight: '10px' }}
                  />
                  启用透视投影
                </label>
                <span className="hint">近大远小的真实3D效果</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 粒子系统 */}
              <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '18px' }}>✨ 粒子系统</h3>
              
              <div className="form-group">
                <label>玻璃粒子数量：{settings.tear_particle_glass_count || '500'}</label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={settings.tear_particle_glass_count || '500'}
                  onChange={(e) => updateSettingField('tear_particle_glass_count', e.target.value)}
                />
                <span className="hint">飞散的玻璃碎屑数量 (0-1000)</span>
              </div>

              <div className="form-group">
                <label>光点粒子数量：{settings.tear_particle_sparkle_count || '200'}</label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={settings.tear_particle_sparkle_count || '200'}
                  onChange={(e) => updateSettingField('tear_particle_sparkle_count', e.target.value)}
                />
                <span className="hint">反光效果粒子数量 (0-500)</span>
              </div>

              <div className="form-group">
                <label>烟雾粒子数量：{settings.tear_particle_smoke_count || '50'}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={settings.tear_particle_smoke_count || '50'}
                  onChange={(e) => updateSettingField('tear_particle_smoke_count', e.target.value)}
                />
                <span className="hint">撕裂瞬间的烟尘效果 (0-100)</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 视觉特效 */}
              <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '18px' }}>🌟 视觉特效</h3>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_bloom === '1'}
                    onChange={(e) => updateSettingField('tear_enable_bloom', e.target.checked ? '1' : '0')}
                    style={{ marginRight: '10px' }}
                  />
                  启用辉光效果（Bloom）
                </label>
                <span className="hint">裂纹边缘发光效果</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_motion_blur === '1'}
                    onChange={(e) => updateSettingField('tear_enable_motion_blur', e.target.checked ? '1' : '0')}
                    style={{ marginRight: '10px' }}
                  />
                  启用运动模糊
                </label>
                <span className="hint">高速运动时的模糊效果</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_enable_chromatic === '1'}
                    onChange={(e) => updateSettingField('tear_enable_chromatic', e.target.checked ? '1' : '0')}
                    style={{ marginRight: '10px' }}
                  />
                  启用色差效果
                </label>
                <span className="hint">碎片边缘RGB分离，增强速度感</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 动画时间配置 */}
              <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '18px' }}>⏱️ 动画时间</h3>
              
              <div className="form-group">
                <label>总时长：{settings.tear_animation_total_duration || '4000'}ms</label>
                <input
                  type="range"
                  min="2000"
                  max="8000"
                  step="500"
                  value={settings.tear_animation_total_duration || '4000'}
                  onChange={(e) => updateSettingField('tear_animation_total_duration', e.target.value)}
                />
                <span className="hint">整个撕裂动画的总时长 (2000-8000ms)</span>
              </div>

              <div className="form-group">
                <label>爆炸力度：{settings.tear_explosion_force || '1.0'}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.tear_explosion_force || '1.0'}
                  onChange={(e) => updateSettingField('tear_explosion_force', e.target.value)}
                />
                <span className="hint">撕裂瞬间碎片飞出的力度 (0.5-2.0)</span>
              </div>

              <div className="form-group">
                <label>慢动作倍率：{settings.tear_slow_motion_factor || '1.0'}</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.1"
                  value={settings.tear_slow_motion_factor || '1.0'}
                  onChange={(e) => updateSettingField('tear_slow_motion_factor', e.target.value)}
                />
                <span className="hint">1.0=正常速度，0.5=慢放2倍 (0.5-1.0)</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 性能配置 */}
              <h3 style={{ marginBottom: '20px', color: '#667eea', fontSize: '18px' }}>⚡ 性能配置</h3>
              
              <div className="form-group">
                <label>纹理分辨率：</label>
                <select
                  value={settings.tear_texture_resolution || '2x'}
                  onChange={(e) => updateSettingField('tear_texture_resolution', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="1x">1x - 标准分辨率（最快）</option>
                  <option value="2x">2x - 高清（推荐）</option>
                  <option value="4x">4x - 超高清（最清晰）</option>
                </select>
                <span className="hint">窗口内容纹理的分辨率倍数</span>
              </div>

              <div className="form-group">
                <label>目标帧率：</label>
                <select
                  value={settings.tear_target_fps || '60'}
                  onChange={(e) => updateSettingField('tear_target_fps', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="30">30 FPS - 省电模式</option>
                  <option value="60">60 FPS - 标准流畅</option>
                  <option value="120">120 FPS - 极致流畅</option>
                </select>
                <span className="hint">动画目标帧率</span>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.tear_adaptive_quality === '1'}
                    onChange={(e) => updateSettingField('tear_adaptive_quality', e.target.checked ? '1' : '0')}
                    style={{ marginRight: '10px' }}
                  />
                  启用自适应质量
                </label>
                <span className="hint">根据设备性能自动调整效果</span>
              </div>

              <hr style={{ margin: '40px 0', border: 'none', borderTop: '3px solid #667eea' }} />

              {/* ===== EXTENDED / NEW SETTINGS (Collapsible) ===== */}

              {/* 裂纹效果扩展 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('crack_ext')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.crack_ext ? '▼' : '▶'} 💥 裂纹效果 (扩展)
                </h3>
                {expandedSections.crack_ext && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>裂纹最小宽度：{settings.tear_crack_width_min || '2'}px</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={settings.tear_crack_width_min || '2'}
                        onChange={(e) => updateSettingField('tear_crack_width_min', e.target.value)}
                      />
                      <span className="hint">裂纹线条的最小宽度 (1-5px)</span>
                    </div>

                    <div className="form-group">
                      <label>裂纹最大宽度：{settings.tear_crack_width_max || '5'}px</label>
                      <input
                        type="range"
                        min="2"
                        max="10"
                        step="1"
                        value={settings.tear_crack_width_max || '5'}
                        onChange={(e) => updateSettingField('tear_crack_width_max', e.target.value)}
                      />
                      <span className="hint">裂纹线条的最大宽度 (2-10px)</span>
                    </div>

                    <div className="form-group">
                      <label>裂纹分支概率：{settings.tear_crack_branch_prob || '0.7'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tear_crack_branch_prob || '0.7'}
                        onChange={(e) => updateSettingField('tear_crack_branch_prob', e.target.value)}
                      />
                      <span className="hint">裂纹产生分支的概率 (0-1)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3D效果扩展 */}
              <div className="form-group">
                <label>相机距离：{settings.tear_camera_distance || '1000'}px</label>
                <input
                  type="range"
                  min="500"
                  max="2000"
                  step="100"
                  value={settings.tear_camera_distance || '1000'}
                  onChange={(e) => updateSettingField('tear_camera_distance', e.target.value)}
                />
                <span className="hint">相机与场景的距离，影响透视强度 (500-2000px)</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 粒子系统扩展 */}
              <div className="form-group">
                <label>粒子生命周期倍数：{settings.tear_particle_lifetime_mult || '1.0'}</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={settings.tear_particle_lifetime_mult || '1.0'}
                  onChange={(e) => updateSettingField('tear_particle_lifetime_mult', e.target.value)}
                />
                <span className="hint">粒子存在时间的倍数 (0.5-3)</span>
              </div>

              <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e0e0e0' }} />

              {/* 视觉特效扩展 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('visual_ext')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.visual_ext ? '▼' : '▶'} 🌟 视觉特效 (扩展)
                </h3>
                {expandedSections.visual_ext && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>辉光阈值：{settings.tear_bloom_threshold || '0.7'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tear_bloom_threshold || '0.7'}
                        onChange={(e) => updateSettingField('tear_bloom_threshold', e.target.value)}
                      />
                      <span className="hint">亮度超过此值才产生辉光 (0-1)</span>
                    </div>

                    <div className="form-group">
                      <label>辉光强度：{settings.tear_bloom_intensity || '1.0'}</label>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={settings.tear_bloom_intensity || '1.0'}
                        onChange={(e) => updateSettingField('tear_bloom_intensity', e.target.value)}
                      />
                      <span className="hint">辉光的强度倍数 (0-3)</span>
                    </div>

                    <div className="form-group">
                      <label>运动模糊采样数：{settings.tear_motion_blur_samples || '6'}</label>
                      <input
                        type="range"
                        min="2"
                        max="16"
                        step="1"
                        value={settings.tear_motion_blur_samples || '6'}
                        onChange={(e) => updateSettingField('tear_motion_blur_samples', e.target.value)}
                      />
                      <span className="hint">运动模糊的采样数，越高越平滑 (2-16)</span>
                    </div>

                    <div className="form-group">
                      <label>运动模糊强度：{settings.tear_motion_blur_intensity || '0.5'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tear_motion_blur_intensity || '0.5'}
                        onChange={(e) => updateSettingField('tear_motion_blur_intensity', e.target.value)}
                      />
                      <span className="hint">运动模糊的强度 (0-1)</span>
                    </div>

                    <div className="form-group">
                      <label>色差偏移量：{settings.tear_chromatic_offset || '2'}px</label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={settings.tear_chromatic_offset || '2'}
                        onChange={(e) => updateSettingField('tear_chromatic_offset', e.target.value)}
                      />
                      <span className="hint">RGB分离的偏移距离 (0-5px)</span>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_ssao === '1'}
                          onChange={(e) => updateSettingField('tear_enable_ssao', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用环境光遮蔽 (SSAO)
                      </label>
                      <span className="hint">模拟环境光被遮挡的效果</span>
                    </div>

                    <div className="form-group">
                      <label>SSAO半径：{settings.tear_ssao_radius || '15'}px</label>
                      <input
                        type="range"
                        min="5"
                        max="20"
                        step="1"
                        value={settings.tear_ssao_radius || '15'}
                        onChange={(e) => updateSettingField('tear_ssao_radius', e.target.value)}
                      />
                      <span className="hint">环境光遮蔽的采样半径 (5-20px)</span>
                    </div>

                    <div className="form-group">
                      <label>SSAO强度：{settings.tear_ssao_intensity || '0.5'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tear_ssao_intensity || '0.5'}
                        onChange={(e) => updateSettingField('tear_ssao_intensity', e.target.value)}
                      />
                      <span className="hint">环境光遮蔽的强度 (0-1)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 动画配置扩展 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('animation_ext')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.animation_ext ? '▼' : '▶'} ⏱️ 动画阶段配置 (扩展)
                </h3>
                {expandedSections.animation_ext && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>裂纹生成阶段占比：{settings.tear_phase_cracking_ratio || '0.3'}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={settings.tear_phase_cracking_ratio || '0.3'}
                        onChange={(e) => updateSettingField('tear_phase_cracking_ratio', e.target.value)}
                      />
                      <span className="hint">裂纹生成阶段占总时长的比例 (0.1-0.5)</span>
                    </div>

                    <div className="form-group">
                      <label>准备阶段占比：{settings.tear_phase_preparing_ratio || '0.1'}</label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.2"
                        step="0.05"
                        value={settings.tear_phase_preparing_ratio || '0.1'}
                        onChange={(e) => updateSettingField('tear_phase_preparing_ratio', e.target.value)}
                      />
                      <span className="hint">撕裂准备阶段占总时长的比例 (0.05-0.2)</span>
                    </div>

                    <div className="form-group">
                      <label>爆炸瞬间占比：{settings.tear_phase_explosion_ratio || '0.05'}</label>
                      <input
                        type="range"
                        min="0.02"
                        max="0.1"
                        step="0.01"
                        value={settings.tear_phase_explosion_ratio || '0.05'}
                        onChange={(e) => updateSettingField('tear_phase_explosion_ratio', e.target.value)}
                      />
                      <span className="hint">爆炸瞬间占总时长的比例 (0.02-0.1)</span>
                    </div>

                    <div className="form-group">
                      <label>碎片飞散阶段占比：{settings.tear_phase_flying_ratio || '0.4'}</label>
                      <input
                        type="range"
                        min="0.3"
                        max="0.6"
                        step="0.05"
                        value={settings.tear_phase_flying_ratio || '0.4'}
                        onChange={(e) => updateSettingField('tear_phase_flying_ratio', e.target.value)}
                      />
                      <span className="hint">碎片飞散阶段占总时长的比例 (0.3-0.6)</span>
                    </div>

                    <div className="form-group">
                      <label>消散阶段占比：{settings.tear_phase_fading_ratio || '0.15'}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.3"
                        step="0.05"
                        value={settings.tear_phase_fading_ratio || '0.15'}
                        onChange={(e) => updateSettingField('tear_phase_fading_ratio', e.target.value)}
                      />
                      <span className="hint">消散阶段占总时长的比例 (0.1-0.3)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 纹理配置 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('texture')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.texture ? '▼' : '▶'} 🖼️ 纹理配置
                </h3>
                {expandedSections.texture && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>纹理过滤方式：</label>
                      <select
                        value={settings.tear_texture_filtering || 'linear'}
                        onChange={(e) => updateSettingField('tear_texture_filtering', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="nearest">Nearest - 最近邻（像素风）</option>
                        <option value="linear">Linear - 线性（平滑）</option>
                      </select>
                      <span className="hint">纹理采样时的过滤方式</span>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_mipmaps === '1'}
                          onChange={(e) => updateSettingField('tear_enable_mipmaps', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用Mipmaps
                      </label>
                      <span className="hint">预生成多级纹理，提升远距离渲染质量</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 碎片配置 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('fragment')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.fragment ? '▼' : '▶'} 🧩 碎片配置
                </h3>
                {expandedSections.fragment && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>碎片数量：{settings.tear_fragment_count || '50'}</label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={settings.tear_fragment_count || '50'}
                        onChange={(e) => updateSettingField('tear_fragment_count', e.target.value)}
                      />
                      <span className="hint">窗口撕裂后的碎片数量 (10-100)</span>
                    </div>

                    <div className="form-group">
                      <label>碎片厚度：{settings.tear_fragment_thickness || '5'}px</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.tear_fragment_thickness || '5'}
                        onChange={(e) => updateSettingField('tear_fragment_thickness', e.target.value)}
                      />
                      <span className="hint">碎片的3D厚度 (1-10px)</span>
                    </div>

                    <div className="form-group">
                      <label>Voronoi细分级别：{settings.tear_voronoi_subdivisions || '3'}</label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={settings.tear_voronoi_subdivisions || '3'}
                        onChange={(e) => updateSettingField('tear_voronoi_subdivisions', e.target.value)}
                      />
                      <span className="hint">Voronoi图的细分级别，越高越碎 (1-5)</span>
                    </div>

                    <div className="form-group">
                      <label>Voronoi扰动强度：{settings.tear_voronoi_perturbation || '15'}px</label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={settings.tear_voronoi_perturbation || '15'}
                        onChange={(e) => updateSettingField('tear_voronoi_perturbation', e.target.value)}
                      />
                      <span className="hint">碎片边缘的随机扰动强度 (0-50px)</span>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_backface === '1'}
                          onChange={(e) => updateSettingField('tear_enable_backface', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用背面渲染
                      </label>
                      <span className="hint">渲染碎片的背面，增加真实感</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 物理配置 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('physics')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.physics ? '▼' : '▶'} ⚛️ 物理配置
                </h3>
                {expandedSections.physics && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>重力加速度：{settings.tear_gravity || '300'}px/s²</label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="50"
                        value={settings.tear_gravity || '300'}
                        onChange={(e) => updateSettingField('tear_gravity', e.target.value)}
                      />
                      <span className="hint">碎片下落的重力强度 (0-1000px/s²)</span>
                    </div>

                    <div className="form-group">
                      <label>空气阻力：{settings.tear_air_resistance || '0.02'}</label>
                      <input
                        type="range"
                        min="0"
                        max="0.1"
                        step="0.01"
                        value={settings.tear_air_resistance || '0.02'}
                        onChange={(e) => updateSettingField('tear_air_resistance', e.target.value)}
                      />
                      <span className="hint">空气对碎片的阻力系数 (0-0.1)</span>
                    </div>

                    <div className="form-group">
                      <label>旋转阻尼：{settings.tear_rotation_damping || '0.98'}</label>
                      <input
                        type="range"
                        min="0.9"
                        max="1.0"
                        step="0.01"
                        value={settings.tear_rotation_damping || '0.98'}
                        onChange={(e) => updateSettingField('tear_rotation_damping', e.target.value)}
                      />
                      <span className="hint">旋转速度的衰减系数，越接近1越持久 (0.9-1.0)</span>
                    </div>

                    <div className="form-group">
                      <label>初始速度倍数：{settings.tear_initial_speed_mult || '1.0'}</label>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={settings.tear_initial_speed_mult || '1.0'}
                        onChange={(e) => updateSettingField('tear_initial_speed_mult', e.target.value)}
                      />
                      <span className="hint">碎片初始飞出速度的倍数 (0.5-3.0)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 光照配置 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('lighting')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.lighting ? '▼' : '▶'} 💡 光照配置
                </h3>
                {expandedSections.lighting && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>光照强度：{settings.tear_lighting_intensity || '1.0'}</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.tear_lighting_intensity || '1.0'}
                        onChange={(e) => updateSettingField('tear_lighting_intensity', e.target.value)}
                      />
                      <span className="hint">整体光照的强度倍数 (0-2)</span>
                    </div>

                    <div className="form-group">
                      <label>环境光强度：{settings.tear_ambient_light || '0.4'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tear_ambient_light || '0.4'}
                        onChange={(e) => updateSettingField('tear_ambient_light', e.target.value)}
                      />
                      <span className="hint">无方向性的基础环境光 (0-1)</span>
                    </div>

                    <div className="form-group">
                      <label>方向光强度：{settings.tear_directional_light || '0.6'}</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tear_directional_light || '0.6'}
                        onChange={(e) => updateSettingField('tear_directional_light', e.target.value)}
                      />
                      <span className="hint">有方向性的主光源强度 (0-1)</span>
                    </div>

                    <div className="form-group">
                      <label>光源方向X：{settings.tear_light_dir_x || '0.5'}</label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={settings.tear_light_dir_x || '0.5'}
                        onChange={(e) => updateSettingField('tear_light_dir_x', e.target.value)}
                      />
                      <span className="hint">光源在X轴的方向分量 (-1 到 1)</span>
                    </div>

                    <div className="form-group">
                      <label>光源方向Y：{settings.tear_light_dir_y || '-1'}</label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={settings.tear_light_dir_y || '-1'}
                        onChange={(e) => updateSettingField('tear_light_dir_y', e.target.value)}
                      />
                      <span className="hint">光源在Y轴的方向分量 (-1 到 1)</span>
                    </div>

                    <div className="form-group">
                      <label>光源方向Z：{settings.tear_light_dir_z || '0.5'}</label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.1"
                        value={settings.tear_light_dir_z || '0.5'}
                        onChange={(e) => updateSettingField('tear_light_dir_z', e.target.value)}
                      />
                      <span className="hint">光源在Z轴的方向分量 (-1 到 1)</span>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_edge_light === '1'}
                          onChange={(e) => updateSettingField('tear_enable_edge_light', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用边缘光（Rim Light）
                      </label>
                      <span className="hint">碎片边缘的轮廓光效果</span>
                    </div>

                    <div className="form-group">
                      <label>边缘光强度：{settings.tear_edge_light_intensity || '1.0'}</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.tear_edge_light_intensity || '1.0'}
                        onChange={(e) => updateSettingField('tear_edge_light_intensity', e.target.value)}
                      />
                      <span className="hint">边缘光的强度 (0-2)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 相机效果 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('camera')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.camera ? '▼' : '▶'} 📹 相机效果
                </h3>
                {expandedSections.camera && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_camera_shake === '1'}
                          onChange={(e) => updateSettingField('tear_enable_camera_shake', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用相机震动
                      </label>
                      <span className="hint">爆炸瞬间的相机震动效果</span>
                    </div>

                    <div className="form-group">
                      <label>相机震动强度：{settings.tear_camera_shake_intensity || '8'}</label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={settings.tear_camera_shake_intensity || '8'}
                        onChange={(e) => updateSettingField('tear_camera_shake_intensity', e.target.value)}
                      />
                      <span className="hint">相机震动的强度 (0-20)</span>
                    </div>

                    <div className="form-group">
                      <label>相机震动时长：{settings.tear_camera_shake_duration || '300'}ms</label>
                      <input
                        type="range"
                        min="100"
                        max="1000"
                        step="50"
                        value={settings.tear_camera_shake_duration || '300'}
                        onChange={(e) => updateSettingField('tear_camera_shake_duration', e.target.value)}
                      />
                      <span className="hint">相机震动持续时间 (100-1000ms)</span>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_camera_tracking === '1'}
                          onChange={(e) => updateSettingField('tear_enable_camera_tracking', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用相机跟踪
                      </label>
                      <span className="hint">相机跟随碎片移动</span>
                    </div>

                    <div className="form-group">
                      <label>相机跟踪平滑度：{settings.tear_camera_tracking_smooth || '0.2'}</label>
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.05"
                        value={settings.tear_camera_tracking_smooth || '0.2'}
                        onChange={(e) => updateSettingField('tear_camera_tracking_smooth', e.target.value)}
                      />
                      <span className="hint">相机跟踪的平滑程度，越大越快 (0-0.5)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 性能配置扩展 */}
              <div className="collapsible-section" style={{ marginBottom: '20px' }}>
                <h3 onClick={() => toggleSection('performance_ext')} style={{ marginBottom: '15px', color: '#667eea', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {expandedSections.performance_ext ? '▼' : '▶'} ⚡ 性能配置 (扩展)
                </h3>
                {expandedSections.performance_ext && (
                  <div style={{ paddingLeft: '20px', borderLeft: '3px solid #667eea' }}>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_lod === '1'}
                          onChange={(e) => updateSettingField('tear_enable_lod', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用LOD（细节层次）
                      </label>
                      <span className="hint">根据距离自动调整渲染细节</span>
                    </div>

                    <div className="form-group">
                      <label>LOD近距离：{settings.tear_lod_distance_near || '200'}px</label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="50"
                        value={settings.tear_lod_distance_near || '200'}
                        onChange={(e) => updateSettingField('tear_lod_distance_near', e.target.value)}
                      />
                      <span className="hint">近距离全细节渲染的范围 (0-500px)</span>
                    </div>

                    <div className="form-group">
                      <label>LOD远距离：{settings.tear_lod_distance_far || '1200'}px</label>
                      <input
                        type="range"
                        min="500"
                        max="2000"
                        step="100"
                        value={settings.tear_lod_distance_far || '1200'}
                        onChange={(e) => updateSettingField('tear_lod_distance_far', e.target.value)}
                      />
                      <span className="hint">远距离低细节渲染的范围 (500-2000px)</span>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.tear_enable_culling === '1'}
                          onChange={(e) => updateSettingField('tear_enable_culling', e.target.checked ? '1' : '0')}
                          style={{ marginRight: '10px' }}
                        />
                        启用视锥剔除
                      </label>
                      <span className="hint">不渲染视野外的碎片以提升性能</span>
                    </div>
                  </div>
                )}
              </div>

              <hr style={{ margin: '40px 0', border: 'none', borderTop: '3px solid #667eea' }} />

              <button onClick={saveSettings} disabled={loading} className="save-btn" style={{ marginTop: '30px' }}>
                保存WebGL配置
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

        .preset-buttons {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .preset-buttons button {
          flex: 1;
          min-width: 150px;
          padding: 12px 20px;
          font-size: 15px;
          font-weight: 600;
        }

        input[type="range"] {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #e0e0e0;
          outline: none;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        input[type="range"]:hover {
          opacity: 1;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
          cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

