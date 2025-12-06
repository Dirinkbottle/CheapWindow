/**
 * 配置面板管理器
 * 动态生成和管理所有 WebGL 参数的 UI 控件
 */

class ConfigPanel {
    constructor() {
        this.config = {};
        this.configGroups = this.defineConfigGroups();
        this.init();
    }

    // 定义配置组和参数
    defineConfigGroups() {
        return [
            {
                name: '基础设置',
                key: 'basic',
                items: [
                    { key: 'enable_webgl_rendering', label: '启用 WebGL', type: 'checkbox', default: '1' },
                    { key: 'webgl_antialiasing', label: '抗锯齿', type: 'checkbox', default: '1' },
                    { key: 'tear_fragment_lifetime', label: '动画时长 (ms)', type: 'range', min: 1000, max: 10000, step: 100, default: '3000' },
                    { key: 'tear_fragment_fade_duration', label: '淡出时长 (ms)', type: 'range', min: 0, max: 3000, step: 100, default: '1000' }
                ]
            },
            {
                name: '粒子系统',
                key: 'particles',
                items: [
                    { key: 'tear_particle_count', label: '总粒子数', type: 'range', min: 0, max: 300, step: 10, default: '50' },
                    { key: 'tear_particle_glass_count', label: '玻璃碎片', type: 'range', min: 0, max: 100, step: 5, default: '20' },
                    { key: 'tear_particle_sparkle_count', label: '火花粒子', type: 'range', min: 0, max: 100, step: 5, default: '15' },
                    { key: 'tear_particle_smoke_count', label: '烟雾粒子', type: 'range', min: 0, max: 100, step: 5, default: '15' },
                    { key: 'tear_particle_lifetime_mult', label: '粒子寿命倍数', type: 'range', min: 0.1, max: 3, step: 0.1, default: '1' }
                ]
            },
            {
                name: '裂纹效果',
                key: 'cracks',
                items: [
                    { key: 'tear_crack_layers', label: '裂纹层数', type: 'range', min: 1, max: 10, step: 1, default: '3' },
                    { key: 'tear_crack_density', label: '裂纹密度', type: 'range', min: 1, max: 20, step: 1, default: '5' },
                    { key: 'tear_crack_width_min', label: '最小宽度', type: 'range', min: 0.5, max: 5, step: 0.5, default: '1' },
                    { key: 'tear_crack_width_max', label: '最大宽度', type: 'range', min: 1, max: 10, step: 0.5, default: '3' },
                    { key: 'tear_crack_branch_prob', label: '分支概率', type: 'range', min: 0, max: 1, step: 0.05, default: '0.3' },
                    { key: 'tear_crack_glow', label: '发光强度', type: 'range', min: 0, max: 2, step: 0.1, default: '1' },
                    { key: 'tear_enable_shadow', label: '启用阴影', type: 'checkbox', default: '1' }
                ]
            },
            {
                name: '碎片设置',
                key: 'fragments',
                items: [
                    { key: 'tear_fragment_count', label: '碎片数量', type: 'range', min: 5, max: 50, step: 1, default: '15' },
                    { key: 'tear_fragment_thickness', label: '碎片厚度', type: 'range', min: 0.1, max: 5, step: 0.1, default: '1' },
                    { key: 'tear_voronoi_subdivisions', label: 'Voronoi 细分', type: 'range', min: 0, max: 5, step: 1, default: '2' },
                    { key: 'tear_voronoi_perturbation', label: '扰动量', type: 'range', min: 0, max: 50, step: 5, default: '10' },
                    { key: 'tear_enable_rotation', label: '启用旋转', type: 'checkbox', default: '1' },
                    { key: 'tear_enable_scale', label: '启用缩放', type: 'checkbox', default: '1' }
                ]
            },
            {
                name: '3D 效果',
                key: '3d',
                items: [
                    { key: 'tear_3d_depth', label: '3D 深度', type: 'range', min: 0, max: 500, step: 10, default: '100' },
                    { key: 'tear_3d_rotation_speed', label: '旋转速度', type: 'range', min: 0, max: 5, step: 0.1, default: '1' },
                    { key: 'tear_camera_fov', label: '相机 FOV', type: 'range', min: 30, max: 120, step: 5, default: '60' },
                    { key: 'tear_camera_distance', label: '相机距离', type: 'range', min: 100, max: 2000, step: 50, default: '800' }
                ]
            },
            {
                name: '物理模拟',
                key: 'physics',
                items: [
                    { key: 'tear_gravity', label: '重力', type: 'range', min: 0, max: 1000, step: 10, default: '200' },
                    { key: 'tear_air_resistance', label: '空气阻力', type: 'range', min: 0, max: 0.1, step: 0.001, default: '0.02' },
                    { key: 'tear_rotation_damping', label: '旋转阻尼', type: 'range', min: 0, max: 1, step: 0.01, default: '0.05' },
                    { key: 'tear_initial_speed_mult', label: '初速度倍数', type: 'range', min: 0.1, max: 5, step: 0.1, default: '1' }
                ]
            },
            {
                name: '光照',
                key: 'lighting',
                items: [
                    { key: 'tear_lighting_intensity', label: '光照强度', type: 'range', min: 0, max: 2, step: 0.1, default: '1' },
                    { key: 'tear_ambient_light', label: '环境光', type: 'range', min: 0, max: 1, step: 0.05, default: '0.3' },
                    { key: 'tear_directional_light', label: '方向光', type: 'range', min: 0, max: 1, step: 0.05, default: '0.7' },
                    { key: 'tear_light_dir_x', label: '光源 X 方向', type: 'range', min: -1, max: 1, step: 0.1, default: '0.5' },
                    { key: 'tear_light_dir_y', label: '光源 Y 方向', type: 'range', min: -1, max: 1, step: 0.1, default: '-0.5' },
                    { key: 'tear_light_dir_z', label: '光源 Z 方向', type: 'range', min: -1, max: 1, step: 0.1, default: '0.8' },
                    { key: 'tear_enable_edge_light', label: '边缘光', type: 'checkbox', default: '1' },
                    { key: 'tear_edge_light_intensity', label: '边缘光强度', type: 'range', min: 0, max: 2, step: 0.1, default: '0.5' }
                ]
            },
            {
                name: '视觉特效',
                key: 'effects',
                items: [
                    { key: 'tear_enable_bloom', label: '启用辉光', type: 'checkbox', default: '0' },
                    { key: 'tear_bloom_threshold', label: '辉光阈值', type: 'range', min: 0, max: 1, step: 0.05, default: '0.8' },
                    { key: 'tear_bloom_intensity', label: '辉光强度', type: 'range', min: 0, max: 3, step: 0.1, default: '1' },
                    { key: 'tear_motion_blur_samples', label: '运动模糊采样', type: 'range', min: 0, max: 16, step: 1, default: '3' },
                    { key: 'tear_motion_blur_intensity', label: '运动模糊强度', type: 'range', min: 0, max: 1, step: 0.05, default: '0.5' },
                    { key: 'tear_chromatic_offset', label: '色差偏移', type: 'range', min: 0, max: 10, step: 0.5, default: '0' },
                    { key: 'tear_enable_ssao', label: '启用 SSAO', type: 'checkbox', default: '0' },
                    { key: 'tear_ssao_radius', label: 'SSAO 半径', type: 'range', min: 0, max: 50, step: 5, default: '20' },
                    { key: 'tear_ssao_intensity', label: 'SSAO 强度', type: 'range', min: 0, max: 2, step: 0.1, default: '1' }
                ]
            },
            {
                name: '相机',
                key: 'camera',
                items: [
                    { key: 'tear_enable_camera_shake', label: '相机抖动', type: 'checkbox', default: '1' },
                    { key: 'tear_camera_shake_intensity', label: '抖动强度', type: 'range', min: 0, max: 50, step: 5, default: '10' },
                    { key: 'tear_camera_shake_duration', label: '抖动时长 (ms)', type: 'range', min: 0, max: 2000, step: 100, default: '500' },
                    { key: 'tear_enable_camera_tracking', label: '相机跟踪', type: 'checkbox', default: '0' },
                    { key: 'tear_camera_tracking_smooth', label: '跟踪平滑', type: 'range', min: 0, max: 1, step: 0.05, default: '0.1' }
                ]
            },
            {
                name: '性能优化',
                key: 'performance',
                items: [
                    { key: 'tear_enable_lod', label: '启用 LOD', type: 'checkbox', default: '0' },
                    { key: 'tear_lod_distance_near', label: 'LOD 近距离', type: 'range', min: 0, max: 500, step: 50, default: '200' },
                    { key: 'tear_lod_distance_far', label: 'LOD 远距离', type: 'range', min: 100, max: 2000, step: 100, default: '800' },
                    { key: 'tear_enable_culling', label: '启用裁剪', type: 'checkbox', default: '1' }
                ]
            }
        ];
    }

    async init() {
        // 加载配置
        await this.loadConfig();
        
        // 渲染配置面板
        this.renderConfigPanel();
        
        // 绑定事件
        this.bindEvents();
    }

    // 从服务器加载配置
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            if (data.success && data.data) {
                this.config = data.data;
            } else {
                // 使用默认值
                this.config = this.getDefaultConfig();
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.config = this.getDefaultConfig();
        }
    }

    // 获取默认配置
    getDefaultConfig() {
        const config = {};
        this.configGroups.forEach(group => {
            group.items.forEach(item => {
                config[item.key] = item.default;
            });
        });
        return config;
    }

    // 渲染配置面板
    renderConfigPanel() {
        const container = document.getElementById('configScroll');
        container.innerHTML = '';

        this.configGroups.forEach(group => {
            const groupEl = this.createConfigGroup(group);
            container.appendChild(groupEl);
        });
    }

    // 创建配置组
    createConfigGroup(group) {
        const groupEl = document.createElement('div');
        groupEl.className = 'config-group';
        groupEl.dataset.group = group.key;

        const header = document.createElement('div');
        header.className = 'config-group-header';
        header.innerHTML = `
            <span class="config-group-title">${group.name}</span>
            <span class="config-group-toggle">▼</span>
        `;
        header.onclick = () => {
            groupEl.classList.toggle('collapsed');
        };

        const content = document.createElement('div');
        content.className = 'config-group-content';

        group.items.forEach(item => {
            const itemEl = this.createConfigItem(item);
            content.appendChild(itemEl);
        });

        groupEl.appendChild(header);
        groupEl.appendChild(content);

        return groupEl;
    }

    // 创建配置项
    createConfigItem(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'config-item';

        const value = this.config[item.key] || item.default;

        if (item.type === 'checkbox') {
            itemEl.innerHTML = `
                <div class="checkbox-container">
                    <input type="checkbox" id="${item.key}" ${value === '1' ? 'checked' : ''}>
                    <label for="${item.key}">${item.label}</label>
                </div>
            `;
        } else if (item.type === 'range') {
            itemEl.innerHTML = `
                <div class="config-label">
                    <span class="config-name">${item.label}</span>
                    <span class="config-value" id="${item.key}_value">${value}</span>
                </div>
                <input type="range" 
                    class="config-input" 
                    id="${item.key}" 
                    min="${item.min}" 
                    max="${item.max}" 
                    step="${item.step}" 
                    value="${value}">
            `;
        } else if (item.type === 'number') {
            itemEl.innerHTML = `
                <div class="config-label">
                    <span class="config-name">${item.label}</span>
                </div>
                <input type="number" 
                    class="config-input" 
                    id="${item.key}" 
                    value="${value}">
            `;
        }

        return itemEl;
    }

    // 绑定事件
    bindEvents() {
        // 监听所有配置变化
        document.getElementById('configScroll').addEventListener('input', (e) => {
            const key = e.target.id;
            let value;

            if (e.target.type === 'checkbox') {
                value = e.target.checked ? '1' : '0';
            } else {
                value = e.target.value;
            }

            // 更新配置
            this.config[key] = value;

            // 更新显示值
            const valueEl = document.getElementById(`${key}_value`);
            if (valueEl) {
                valueEl.textContent = value;
            }

            // 通知演示更新（使用事件）
            window.dispatchEvent(new CustomEvent('configUpdate', {
                detail: { [key]: value }
            }));
        });

        // 预设按钮
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadPreset(btn.dataset.preset);
            });
        });

        // 展开/折叠全部
        document.getElementById('toggleAllBtn').addEventListener('click', () => {
            const groups = document.querySelectorAll('.config-group');
            const allCollapsed = Array.from(groups).every(g => g.classList.contains('collapsed'));
            
            groups.forEach(g => {
                if (allCollapsed) {
                    g.classList.remove('collapsed');
                } else {
                    g.classList.add('collapsed');
                }
            });

            document.getElementById('toggleAllBtn').textContent = 
                allCollapsed ? '折叠全部' : '展开全部';
        });

        // 保存按钮
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveConfig();
        });

        // 加载按钮
        document.getElementById('loadBtn').addEventListener('click', () => {
            this.loadConfig().then(() => {
                this.updateUI();
                window.showToast('配置已从数据库加载', 'success');
            });
        });
    }

    // 加载预设
    async loadPreset(presetName) {
        try {
            const response = await fetch(`/api/presets/${presetName}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                // 合并到当前配置
                Object.assign(this.config, data.data);
                this.updateUI();
                window.showToast(`已应用 ${presetName} 预设`, 'success');
            }
        } catch (error) {
            console.error('加载预设失败:', error);
            window.showToast('加载预设失败', 'error');
        }
    }

    // 保存配置到数据库
    async saveConfig() {
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });

            const data = await response.json();
            if (data.success) {
                window.showToast(data.message || '配置已保存', 'success');
            } else {
                window.showToast(data.message || '保存失败', 'error');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            window.showToast('保存配置失败', 'error');
        }
    }

    // 更新 UI 显示
    updateUI() {
        this.configGroups.forEach(group => {
            group.items.forEach(item => {
                const el = document.getElementById(item.key);
                if (!el) return;

                const value = this.config[item.key] || item.default;

                if (item.type === 'checkbox') {
                    el.checked = value === '1';
                } else {
                    el.value = value;
                }

                // 更新显示值
                const valueEl = document.getElementById(`${item.key}_value`);
                if (valueEl) {
                    valueEl.textContent = value;
                }
            });
        });

        // 通知演示更新所有配置（使用事件）
        window.dispatchEvent(new CustomEvent('configBatchUpdate', {
            detail: this.config
        }));
    }

    // 获取当前配置
    getConfig() {
        return this.config;
    }
}

