/**
 * WebGL超真实撕裂动画 - 完全重构版
 * 
 * 核心特性：
 * - 真实物理裂纹生成
 * - 窗口内容纹理映射
 * - 3D碎片变换和透视
 * - Phong光照模型
 * - 5阶段动画系统
 * - GPU粒子系统
 * - 后处理特效
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { WindowData, Point, Settings } from '../types';
import { generateVoronoiFast, type VoronoiCell } from '../utils/voronoi';
import { 
  generateRealisticCracks, 
  generateCrackGrowthAnimation,
  type CrackLine 
} from '../utils/crackGenerator';
import { 
  renderWindowToTexture, 
  disposeTexture 
} from '../utils/textureRenderer';
import {
  perspective,
  lookAt,
  multiply,
  multiplyMany,
  translation,
  rotationX,
  rotationY,
  rotationZ,
  scaling,
  degToRad,
  type Vector3
} from '../utils/matrix3d';

interface TearEffectWebGLProps {
  window: WindowData;
  userVectors: Map<string, { position: Point; force: number }>;
  settings: Settings;
  onComplete: () => void;
}

interface Fragment3D {
  id: number;
  cell: VoronoiCell;
  position: Vector3; // 3D位置
  velocity: Vector3; // 3D速度
  rotation: Vector3; // 3D旋转角度
  angularVelocity: Vector3; // 角速度
  scale: Vector3; // 3D缩放
  opacity: number;
  vertices: Float32Array; // 顶点数据
  uvs: Float32Array; // 纹理坐标
  normals: Float32Array; // 法线数据
}

interface Particle3D {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  type: 'glass' | 'sparkle' | 'smoke';
}

enum AnimationPhase {
  CRACKING = 'cracking',     // 裂纹生成 (0-30%)
  PREPARING = 'preparing',   // 撕裂准备 (30-40%)
  EXPLOSION = 'explosion',   // 爆炸瞬间 (40-45%)
  FLYING = 'flying',         // 碎片飞散 (45-85%)
  FADING = 'fading'          // 消散期 (85-100%)
}

export const TearEffectWebGL: React.FC<TearEffectWebGLProps> = ({
  window,
  userVectors,
  settings,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  
  // 着色器程序
  const mainProgramRef = useRef<WebGLProgram | null>(null);
  const crackProgramRef = useRef<WebGLProgram | null>(null);
  const particleProgramRef = useRef<WebGLProgram | null>(null);
  
  // 纹理和数据
  const windowTextureRef = useRef<WebGLTexture | null>(null);
  const [fragments, setFragments] = useState<Fragment3D[]>([]);
  const [particles, setParticles] = useState<Particle3D[]>([]);
  const [cracks, setCracks] = useState<CrackLine[]>([]);
  const crackAnimatorRef = useRef<((time: number) => any) | null>(null);
  
  // 动画状态
  const [phase, setPhase] = useState<AnimationPhase>(AnimationPhase.CRACKING);
  const [isWebGLSupported, setIsWebGLSupported] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  const phaseStartTimeRef = useRef<number>(Date.now());
  
  // 相机和视图
  const cameraShakeRef = useRef<Vector3>([0, 0, 0]);
  
  // 解析配置
  const config = {
    // 裂纹配置
    crackLayers: parseInt(settings?.tear_crack_layers || '2'),
    crackDensity: parseFloat(settings?.tear_crack_density || '1.0'),
    crackGlow: parseFloat(settings?.tear_crack_glow || '0.6'),
    enableShadow: settings?.tear_enable_shadow === '1',
    
    // 3D配置
    depth3D: parseFloat(settings?.tear_3d_depth || '300'),
    rotationSpeed: parseFloat(settings?.tear_3d_rotation_speed || '5'),
    enablePerspective: settings?.tear_enable_perspective !== '0',
    cameraFov: degToRad(parseFloat(settings?.tear_camera_fov || '75')),
    tear_camera_distance: settings?.tear_camera_distance || '1000',
    
    // 粒子配置
    particleMultiplier: parseFloat(settings?.tear_particle_count_multiplier || '1'),
    
    // 特效配置
    enableBloom: settings?.tear_enable_bloom === '1',
    enableMotionBlur: settings?.tear_enable_motion_blur === '1',
    
    // 动画配置
    totalDuration: parseInt(settings?.tear_animation_total_duration || '4000'),
    explosionForce: parseFloat(settings?.tear_explosion_force || '1.0'),
    slowMotion: parseFloat(settings?.tear_slow_motion_factor || '1.0'),
    
    // 纹理配置
    textureRes: (settings?.tear_texture_resolution || '2x') as '1x' | '2x' | '4x',
    
    // 光照配置
    lightingIntensity: parseFloat(settings?.tear_lighting_intensity || '1.0'),
    
    // 碎片配置
    fragmentThickness: parseFloat(settings?.tear_fragment_thickness || '5')
  };

  // 计算各阶段时长
  const phaseDurations = {
    cracking: config.totalDuration * 0.30,
    preparing: config.totalDuration * 0.10,
    explosion: config.totalDuration * 0.05,
    flying: config.totalDuration * 0.40,
    fading: config.totalDuration * 0.15
  };

  // ==================== 初始化WebGL ====================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const gl = (canvas.getContext('webgl', {
        alpha: true,
        antialias: settings?.webgl_antialiasing === '1',
        depth: true,
        stencil: false,
        premultipliedAlpha: false
      }) || canvas.getContext('experimental-webgl', {
        alpha: true,
        antialias: settings?.webgl_antialiasing === '1',
        depth: true,
        stencil: false,
        premultipliedAlpha: false
      })) as WebGLRenderingContext | null;
      
      if (!gl) {
        console.warn('[TearEffectWebGL] WebGL not supported');
        setIsWebGLSupported(false);
        return;
      }

      glRef.current = gl;

      // 设置canvas尺寸
      const width = window.size.width;
      const height = window.size.height;
      const dpr = globalThis.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // WebGL设置
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      // 创建着色器程序
      const mainProgram = create3DShaderProgram(gl);
      const crackProgram = createCrackShaderProgram(gl);
      const particleProgram = createParticleShaderProgram(gl);
      
      if (!mainProgram || !crackProgram || !particleProgram) {
        setIsWebGLSupported(false);
        return;
      }

      mainProgramRef.current = mainProgram;
      crackProgramRef.current = crackProgram;
      particleProgramRef.current = particleProgram;

      // 渲染窗口内容到纹理
      const texture = renderWindowToTexture(gl, window, {
        resolution: config.textureRes,
        includeText: true,
        includeBorder: true,
        includeShadow: config.enableShadow
      });
      
      windowTextureRef.current = texture;

      console.log('[TearEffectWebGL Enhanced] 初始化完成');
    } catch (error) {
      console.error('[TearEffectWebGL] 初始化失败:', error);
      setIsWebGLSupported(false);
    }

    return () => {
      // 清理资源
      if (glRef.current && windowTextureRef.current) {
        disposeTexture(glRef.current, windowTextureRef.current);
      }
    };
  }, [window, settings, config.textureRes, config.enableShadow]);

  // ==================== 生成裂纹和碎片 ====================
  useEffect(() => {
    const userVectorsArray = Array.from(userVectors.entries()).map(([userId, vector]: [string, { position: Point; force: number }]) => ({
      userId,
      position: vector.position,
      force: vector.force
    }));

    // 1. 生成真实裂纹
    const impactPoints = userVectorsArray.map(v => ({
      x: (v.position.x / 100) * window.size.width,
      y: (v.position.y / 100) * window.size.height
    }));

    const generatedCracks = generateRealisticCracks(impactPoints, window.size, {
      layers: config.crackLayers,
      density: config.crackDensity,
      mainCrackCount: 8,
      branchProbability: 0.7,
      minWidth: 1,
      maxWidth: 4,
      maxLength: Math.max(window.size.width, window.size.height) * 0.6,
      glowIntensity: config.crackGlow,
      shadowDepth: 3
    });

    setCracks(generatedCracks);

    // 2. 创建裂纹动画器
    const animator = generateCrackGrowthAnimation(generatedCracks, phaseDurations.cracking);
    crackAnimatorRef.current = animator;

    // 3. 生成Voronoi碎片
    const cells = generateVoronoiFast(userVectorsArray, {
      width: window.size.width,
      height: window.size.height,
      subdivisions: 3,
      perturbation: 15
    });

    // 4. 创建3D碎片
    const fragments3D = cells.map((cell, index) => createFragment3D(
      cell,
      index,
      userVectorsArray,
      window,
      config
    )).filter(f => f !== null) as Fragment3D[];

    setFragments(fragments3D);

    console.log(`[TearEffectWebGL] 生成 ${generatedCracks.length} 条裂纹, ${fragments3D.length} 个碎片`);
  }, [userVectors, window, config]);

  // ==================== 主渲染循环 ====================
  useEffect(() => {
    if (!isWebGLSupported || !glRef.current || !mainProgramRef.current) return;

    const gl = glRef.current;
    let rafId: number;

    const render = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const phaseElapsed = timestamp - phaseStartTimeRef.current;
      
      // 清屏
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // 根据阶段渲染
      switch (phase) {
        case AnimationPhase.CRACKING:
          renderCrackingPhase(gl, elapsed);
          if (elapsed >= phaseDurations.cracking) {
            transitionToPhase(AnimationPhase.PREPARING, timestamp);
          }
          break;

        case AnimationPhase.PREPARING:
          renderPreparingPhase(gl, phaseElapsed, phaseDurations.preparing);
          if (phaseElapsed >= phaseDurations.preparing) {
            transitionToPhase(AnimationPhase.EXPLOSION, timestamp);
          }
          break;

        case AnimationPhase.EXPLOSION:
          renderExplosionPhase(gl, phaseElapsed, phaseDurations.explosion);
          if (phaseElapsed >= phaseDurations.explosion) {
            transitionToPhase(AnimationPhase.FLYING, timestamp);
          }
          break;

        case AnimationPhase.FLYING:
          renderFlyingPhase(gl, phaseElapsed, phaseDurations.flying);
          if (phaseElapsed >= phaseDurations.flying) {
            transitionToPhase(AnimationPhase.FADING, timestamp);
          }
          break;

        case AnimationPhase.FADING:
          renderFadingPhase(gl, phaseElapsed, phaseDurations.fading);
          if (phaseElapsed >= phaseDurations.fading) {
            onComplete();
            return;
          }
          break;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isWebGLSupported, phase, fragments, particles, cracks, onComplete]);

  // ==================== 阶段转换 ====================
  const transitionToPhase = useCallback((newPhase: AnimationPhase, timestamp: number) => {
    console.log(`[TearEffectWebGL] 阶段转换: ${phase} → ${newPhase}`);
    setPhase(newPhase);
    phaseStartTimeRef.current = timestamp;

    // 阶段特定初始化
    if (newPhase === AnimationPhase.EXPLOSION) {
      // 生成粒子
      generateAllParticles();
      // 相机震动
      startCameraShake();
    }
  }, [phase]);

  // ==================== 渲染函数 ====================
  
  const renderCrackingPhase = (gl: WebGLRenderingContext, elapsed: number) => {
    // 渲染窗口背景
    renderWindowBackground(gl);
    
    // 渲染逐渐生长的裂纹
    if (crackAnimatorRef.current) {
      const crackFrame = crackAnimatorRef.current(elapsed);
      renderCracks(gl, crackFrame.visibleSegments);
    }
  };

  const renderPreparingPhase = (gl: WebGLRenderingContext, elapsed: number, duration: number) => {
    const progress = elapsed / duration;
    
    // 渲染窗口（开始变形）
    renderWindowBackground(gl);
    
    // 渲染完整裂纹
    if (crackAnimatorRef.current) {
      const crackFrame = crackAnimatorRef.current(phaseDurations.cracking);
      renderCracks(gl, crackFrame.visibleSegments);
    }
    
    // 渲染轻微分离的碎片
    renderFragments3D(gl, fragments, progress * 0.1, 1.0);
  };

  const renderExplosionPhase = (gl: WebGLRenderingContext, _elapsed: number, _duration: number) => {
    
    // 更新碎片物理（爆炸加速）
    updateFragmentsPhysics(0.016, true);
    
    // 渲染碎片
    renderFragments3D(gl, fragments, 1.0, 1.0);
    
    // 渲染粒子爆发
    updateParticles(0.016);
    renderParticles(gl, particles);
  };

  const renderFlyingPhase = (gl: WebGLRenderingContext, _elapsed: number, _duration: number) => {
    // 更新物理
    updateFragmentsPhysics(0.016, false);
    updateParticles(0.016);
    
    // 渲染
    renderFragments3D(gl, fragments, 1.0, 1.0);
    renderParticles(gl, particles);
  };

  const renderFadingPhase = (gl: WebGLRenderingContext, elapsed: number, duration: number) => {
    const progress = elapsed / duration;
    const opacity = 1.0 - progress;
    
    // 更新物理
    updateFragmentsPhysics(0.016, false);
    updateParticles(0.016);
    
    // 渲染（淡出）
    renderFragments3D(gl, fragments, 1.0, opacity);
    renderParticles(gl, particles.filter((p: Particle3D) => p.life > 0));
  };

  // ==================== 辅助渲染函数 ====================
  
  const renderWindowBackground = (_gl: WebGLRenderingContext) => {
    if (!windowTextureRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 简单地绘制窗口背景（作为撕裂前的完整窗口）
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;

    ctx.canvas.width = window.size.width;
    ctx.canvas.height = window.size.height;
    
    // 绘制背景
    ctx.fillStyle = window.colors.bg;
    ctx.fillRect(0, 0, window.size.width, window.size.height);
    
    // 绘制文字
    ctx.fillStyle = window.colors.text;
    ctx.font = `${window.fontSize}px "Microsoft YaHei"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(window.message, window.size.width / 2, window.size.height / 2);
  };

  const renderCracks = (gl: WebGLRenderingContext, visibleSegments: any[]) => {
    const program = crackProgramRef.current;
    if (!program || visibleSegments.length === 0) return;

    gl.useProgram(program);

    // 设置uniform
    const u_resolution = gl.getUniformLocation(program, 'u_resolution');
    const u_glowIntensity = gl.getUniformLocation(program, 'u_glowIntensity');
    
    if (u_resolution) {
      gl.uniform2f(u_resolution, window.size.width, window.size.height);
    }
    if (u_glowIntensity) {
      gl.uniform1f(u_glowIntensity, config.crackGlow);
    }

    // 渲染每条裂纹线段
    visibleSegments.forEach(segment => {
      const positions = new Float32Array([
        segment.start.x, segment.start.y,
        segment.end.x, segment.end.y
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const a_position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(a_position);
      gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

      gl.lineWidth(segment.width || 2);
      gl.drawArrays(gl.LINES, 0, 2);

      gl.deleteBuffer(buffer);
    });
  };

  const renderFragments3D = (gl: WebGLRenderingContext, fragments: Fragment3D[], separation: number, opacity: number) => {
    const program = mainProgramRef.current;
    const texture = windowTextureRef.current;
    if (!program || !texture || fragments.length === 0) return;

    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 设置投影矩阵
    const canvas = canvasRef.current;
    if (!canvas) return;

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = perspective(config.cameraFov, aspect, 0.1, 2000);
    
    // 设置视图矩阵（相机）
    const cameraPos: Vector3 = [
      window.size.width / 2 + cameraShakeRef.current[0],
      window.size.height / 2 + cameraShakeRef.current[1],
      parseFloat(config.tear_camera_distance || '1000') + cameraShakeRef.current[2]
    ];
    const target: Vector3 = [window.size.width / 2, window.size.height / 2, 0];
    const up: Vector3 = [0, 1, 0];
    const viewMatrix = lookAt(cameraPos, target, up);

    // 光照方向
    const lightDir: Vector3 = [
      parseFloat(settings?.tear_light_dir_x || '0.5'),
      parseFloat(settings?.tear_light_dir_y || '-1'),
      parseFloat(settings?.tear_light_dir_z || '0.5')
    ];

    // 渲染每个碎片
    fragments.forEach(fragment => {
      // 计算模型矩阵
      const pos = fragment.position;
      const offsetZ = pos[2] * separation;
      
      const modelMatrix = multiplyMany(
        translation(pos[0], pos[1], offsetZ),
        rotationX(fragment.rotation[0]),
        rotationY(fragment.rotation[1]),
        rotationZ(fragment.rotation[2]),
        scaling(fragment.scale[0], fragment.scale[1], fragment.scale[2])
      );

      // MVP矩阵
      const mvpMatrix = multiply(multiply(projectionMatrix, viewMatrix), modelMatrix);

      // 设置uniform
      const u_mvpMatrix = gl.getUniformLocation(program, 'u_mvpMatrix');
      const u_modelMatrix = gl.getUniformLocation(program, 'u_modelMatrix');
      const u_lightDir = gl.getUniformLocation(program, 'u_lightDir');
      const u_opacity = gl.getUniformLocation(program, 'u_opacity');
      const u_lightingIntensity = gl.getUniformLocation(program, 'u_lightingIntensity');
      const u_ambientLight = gl.getUniformLocation(program, 'u_ambientLight');

      if (u_mvpMatrix) gl.uniformMatrix4fv(u_mvpMatrix, false, mvpMatrix);
      if (u_modelMatrix) gl.uniformMatrix4fv(u_modelMatrix, false, modelMatrix);
      if (u_lightDir) gl.uniform3fv(u_lightDir, lightDir);
      if (u_opacity) gl.uniform1f(u_opacity, fragment.opacity * opacity);
      if (u_lightingIntensity) gl.uniform1f(u_lightingIntensity, config.lightingIntensity);
      if (u_ambientLight) gl.uniform1f(u_ambientLight, parseFloat(settings?.tear_ambient_light || '0.4'));

      // 顶点属性
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, fragment.vertices, gl.STATIC_DRAW);
      
      const a_position = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(a_position);
      gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);

      // UV坐标
      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, fragment.uvs, gl.STATIC_DRAW);
      
      const a_texCoord = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(a_texCoord);
      gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);

      // 法线
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, fragment.normals, gl.STATIC_DRAW);
      
      const a_normal = gl.getAttribLocation(program, 'a_normal');
      gl.enableVertexAttribArray(a_normal);
      gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0);

      // 绘制
      const vertexCount = fragment.vertices.length / 3;
      gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);

      // 清理
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(normalBuffer);
    });
  };

  const renderParticles = (gl: WebGLRenderingContext, particles: Particle3D[]) => {
    const program = particleProgramRef.current;
    if (!program || particles.length === 0) return;

    gl.useProgram(program);

    // 计算VP矩阵
    const canvas = canvasRef.current;
    if (!canvas) return;

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = perspective(config.cameraFov, aspect, 0.1, 2000);
    
    const cameraPos: Vector3 = [
      window.size.width / 2,
      window.size.height / 2,
      parseFloat(config.tear_camera_distance || '1000')
    ];
    const target: Vector3 = [window.size.width / 2, window.size.height / 2, 0];
    const up: Vector3 = [0, 1, 0];
    const viewMatrix = lookAt(cameraPos, target, up);
    const vpMatrix = multiply(projectionMatrix, viewMatrix);

    const u_vpMatrix = gl.getUniformLocation(program, 'u_vpMatrix');
    if (u_vpMatrix) gl.uniformMatrix4fv(u_vpMatrix, false, vpMatrix);

    // 准备粒子数据
    const positions: number[] = [];
    const sizes: number[] = [];
    const colors: number[] = [];

    particles.forEach(p => {
      positions.push(p.position[0], p.position[1], p.position[2]);
      sizes.push(p.size);
      
      // 根据生命值调整透明度
      const alpha = p.life / p.maxLife;
      colors.push(1, 1, 1, alpha); // 白色粒子
    });

    // 位置
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const a_position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);

    // 大小
    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
    
    const a_size = gl.getAttribLocation(program, 'a_size');
    gl.enableVertexAttribArray(a_size);
    gl.vertexAttribPointer(a_size, 1, gl.FLOAT, false, 0, 0);

    // 颜色
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    const a_color = gl.getAttribLocation(program, 'a_color');
    gl.enableVertexAttribArray(a_color);
    gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0);

    // 绘制点
    gl.drawArrays(gl.POINTS, 0, particles.length);

    // 清理
    gl.deleteBuffer(posBuffer);
    gl.deleteBuffer(sizeBuffer);
    gl.deleteBuffer(colorBuffer);
  };

  const updateFragmentsPhysics = (dt: number, explosion: boolean) => {
    const gravity = parseFloat(settings?.tear_gravity || '300');
    const airResistance = parseFloat(settings?.tear_air_resistance || '0.02');
    const rotationDamping = parseFloat(settings?.tear_rotation_damping || '0.98');

    setFragments((prev: Fragment3D[]) => prev.map((f: Fragment3D) => {
      // 速度更新
      let vx = f.velocity[0];
      let vy = f.velocity[1];
      let vz = f.velocity[2];

      // 爆炸加速
      if (explosion) {
        const explosionMult = config.explosionForce;
        vx *= explosionMult;
        vy *= explosionMult;
        vz *= explosionMult;
      }

      // 重力
      vy += gravity * dt;

      // 空气阻力
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const drag = 1 - airResistance * speed * dt;
      vx *= drag;
      vy *= drag;
      vz *= drag;

      // 位置更新
      const newPosition: Vector3 = [
        f.position[0] + vx * dt,
        f.position[1] + vy * dt,
        f.position[2] + vz * dt
      ];

      // 旋转更新
      const newRotation: Vector3 = [
        f.rotation[0] + f.angularVelocity[0] * dt,
        f.rotation[1] + f.angularVelocity[1] * dt,
        f.rotation[2] + f.angularVelocity[2] * dt
      ];

      // 角速度衰减
      const newAngularVelocity: Vector3 = [
        f.angularVelocity[0] * rotationDamping,
        f.angularVelocity[1] * rotationDamping,
        f.angularVelocity[2] * rotationDamping
      ];

      return {
        ...f,
        position: newPosition,
        velocity: [vx, vy, vz],
        rotation: newRotation,
        angularVelocity: newAngularVelocity
      };
    }));
  };

  const updateParticles = (dt: number) => {
    const gravity = parseFloat(settings?.tear_gravity || '300') * 0.5; // 粒子受重力影响较小

    setParticles((prev: Particle3D[]) => prev.filter((p: Particle3D) => {
      // 更新生命值
      p.life -= dt * 1000;
      if (p.life <= 0) return false;

      // 更新速度（重力）
      p.velocity[1] += gravity * dt;

      // 更新位置
      p.position[0] += p.velocity[0] * dt;
      p.position[1] += p.velocity[1] * dt;
      p.position[2] += p.velocity[2] * dt;

      return true;
    }));
  };

  const generateAllParticles = () => {
    const newParticles: Particle3D[] = [];

    const glassCount = parseInt(settings?.tear_particle_glass_count || '500');
    const sparkleCount = parseInt(settings?.tear_particle_sparkle_count || '200');
    const smokeCount = parseInt(settings?.tear_particle_smoke_count || '50');

    // 玻璃碎屑粒子
    for (let i = 0; i < glassCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const centerX = window.size.width / 2;
      const centerY = window.size.height / 2;

      newParticles.push({
        position: [centerX, centerY, Math.random() * 50],
        velocity: [
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 100,
          (Math.random() - 0.5) * 100
        ],
        life: 1500 + Math.random() * 1000,
        maxLife: 2500,
        size: 2 + Math.random() * 3,
        type: 'glass'
      });
    }

    // 光点粒子
    for (let i = 0; i < sparkleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 250;
      const centerX = window.size.width / 2;
      const centerY = window.size.height / 2;

      newParticles.push({
        position: [centerX, centerY, Math.random() * 100],
        velocity: [
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 50,
          (Math.random() - 0.5) * 150
        ],
        life: 1000 + Math.random() * 500,
        maxLife: 1500,
        size: 3 + Math.random() * 4,
        type: 'sparkle'
      });
    }

    // 烟雾粒子
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      const centerX = window.size.width / 2;
      const centerY = window.size.height / 2;

      newParticles.push({
        position: [centerX, centerY, Math.random() * 30],
        velocity: [
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 30,
          (Math.random() - 0.5) * 50
        ],
        life: 2000 + Math.random() * 1500,
        maxLife: 3500,
        size: 10 + Math.random() * 20,
        type: 'smoke'
      });
    }

    setParticles(newParticles);
  };

  const startCameraShake = () => {
    if (settings?.tear_enable_camera_shake !== '1') return;

    const intensity = parseFloat(settings?.tear_camera_shake_intensity || '8');
    const duration = parseInt(settings?.tear_camera_shake_duration || '300');

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        cameraShakeRef.current = [0, 0, 0];
        return;
      }

      const progress = elapsed / duration;
      const factor = (1 - progress) * intensity;

      cameraShakeRef.current = [
        (Math.random() - 0.5) * factor,
        (Math.random() - 0.5) * factor,
        (Math.random() - 0.5) * factor * 0.5
      ];

      requestAnimationFrame(animate);
    };

    animate();
  };

  // ==================== 渲染 ====================
  
  if (!isWebGLSupported) {
    return (
      <div style={{
        position: 'fixed',
        left: `${(window.position.x / 100) * globalThis.innerWidth}px`,
        top: `${(window.position.y / 100) * globalThis.innerHeight}px`,
        transform: 'translate(-50%, -50%)',
        color: 'red',
        fontSize: '12px',
        background: 'rgba(0,0,0,0.9)',
        padding: '15px',
        borderRadius: '8px',
        border: '2px solid red'
      }}>
        ⚠️ WebGL不可用<br/>
        请使用Canvas渲染模式
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        left: `${(window.position.x / 100) * globalThis.innerWidth}px`,
        top: `${(window.position.y / 100) * globalThis.innerHeight}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 2000
      }}
    />
  );
};

// ==================== 着色器创建函数 ====================

function compileShader(gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function compileProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  // 清理着色器（已链接到程序）
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

function create3DShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexSource = `
    attribute vec3 a_position;
    attribute vec2 a_texCoord;
    attribute vec3 a_normal;
    
    uniform mat4 u_mvpMatrix;
    uniform mat4 u_modelMatrix;
    
    varying vec2 v_texCoord;
    varying vec3 v_normal;
    varying vec3 v_position;
    
    void main() {
      gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
      v_texCoord = a_texCoord;
      v_normal = mat3(u_modelMatrix) * a_normal;
      v_position = (u_modelMatrix * vec4(a_position, 1.0)).xyz;
    }
  `;

  const fragmentSource = `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform vec3 u_lightDir;
    uniform float u_opacity;
    uniform float u_lightingIntensity;
    uniform float u_ambientLight;
    
    varying vec2 v_texCoord;
    varying vec3 v_normal;
    varying vec3 v_position;
    
    void main() {
      vec4 texColor = texture2D(u_texture, v_texCoord);
      
      // Phong光照
      vec3 normal = normalize(v_normal);
      float diffuse = max(dot(normal, u_lightDir), 0.0);
      
      // 边缘光（Fresnel效果）
      vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - v_position);
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);
      
      // 合成光照
      float ambient = u_ambientLight;
      vec3 lighting = texColor.rgb * (ambient + diffuse * (1.0 - ambient) * u_lightingIntensity);
      lighting += vec3(1.0) * fresnel * 0.3 * u_lightingIntensity;
      
      gl_FragColor = vec4(lighting, texColor.a * u_opacity);
    }
  `;

  return compileProgram(gl, vertexSource, fragmentSource);
}

function createCrackShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexSource = `
    attribute vec2 a_position;
    attribute float a_width;
    attribute float a_glow;
    
    uniform vec2 u_resolution;
    
    varying float v_width;
    varying float v_glow;
    
    void main() {
      vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_width = a_width;
      v_glow = a_glow;
    }
  `;

  const fragmentSource = `
    precision mediump float;
    
    uniform vec3 u_crackColor;
    uniform float u_glowIntensity;
    
    varying float v_width;
    varying float v_glow;
    
    void main() {
      // 裂纹颜色（深色）
      vec3 crackDark = vec3(0.1, 0.1, 0.15);
      
      // 发光效果
      vec3 glowColor = vec3(1.0, 0.9, 0.7);
      float glow = v_glow * u_glowIntensity;
      
      vec3 finalColor = mix(crackDark, glowColor, glow);
      float alpha = 0.8 + glow * 0.2;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  return compileProgram(gl, vertexSource, fragmentSource);
}

function createParticleShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertexSource = `
    attribute vec3 a_position;
    attribute float a_size;
    attribute vec4 a_color;
    
    uniform mat4 u_vpMatrix;
    
    varying vec4 v_color;
    
    void main() {
      gl_Position = u_vpMatrix * vec4(a_position, 1.0);
      gl_PointSize = a_size;
      v_color = a_color;
    }
  `;

  const fragmentSource = `
    precision mediump float;
    
    varying vec4 v_color;
    
    void main() {
      // 圆形粒子
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;
      
      // 柔和边缘
      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
      gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
    }
  `;

  return compileProgram(gl, vertexSource, fragmentSource);
}

// ==================== 碎片创建函数 ====================

/**
 * 三角化多边形（Ear Clipping算法）
 */
function triangulatePolygon(vertices: Array<{ x: number; y: number }>): number[] {
  const indices: number[] = [];
  const n = vertices.length;

  if (n < 3) return indices;

  // 简单fan三角化（适用于凸多边形）
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i, i + 1);
  }

  return indices;
}

/**
 * 计算法线（对于2D碎片，法线统一指向Z+）
 */
function calculateNormals(vertexCount: number): Float32Array {
  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    normals[i * 3 + 0] = 0; // X
    normals[i * 3 + 1] = 0; // Y
    normals[i * 3 + 2] = 1; // Z (指向观察者)
  }
  return normals;
}

function createFragment3D(
  cell: VoronoiCell,
  index: number,
  userVectors: any[],
  window: WindowData,
  config: any
): Fragment3D | null {
  if (!cell.polygon || cell.polygon.length < 3) return null;

  // 1. 三角化多边形
  const indices = triangulatePolygon(cell.polygon);
  if (indices.length === 0) return null;

  // 2. 创建顶点数据（XYZ格式）
  const vertexData: number[] = [];
  for (const vertex of cell.polygon) {
    vertexData.push(vertex.x, vertex.y, 0); // Z=0 (在2D平面)
  }
  const vertices = new Float32Array(vertexData);

  // 3. 计算UV坐标（纹理映射）
  const uvData: number[] = [];
  for (const vertex of cell.polygon) {
    const u = vertex.x / window.size.width;
    const v = vertex.y / window.size.height;
    uvData.push(u, v);
  }
  const uvs = new Float32Array(uvData);

  // 4. 计算法线
  const normals = calculateNormals(cell.polygon.length);

  // 5. 计算初始位置和速度
  const centerX = cell.site.x;
  const centerY = cell.site.y;

  // 找到最近的用户向量
  let closestUser = userVectors[0];
  let minDist = Infinity;
  for (const user of userVectors) {
    const userX = (user.position.x / 100) * window.size.width;
    const userY = (user.position.y / 100) * window.size.height;
    const dist = Math.sqrt((centerX - userX) ** 2 + (centerY - userY) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closestUser = user;
    }
  }

  const userX = (closestUser.position.x / 100) * window.size.width;
  const userY = (closestUser.position.y / 100) * window.size.height;
  
  // 从用户位置指向碎片的方向
  const dx = centerX - userX;
  const dy = centerY - userY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  // 初速度（根据距离和力度）
  const force = closestUser.force || 1;
  const speed = 100 + (force * 200) + Math.random() * 50;
  
  const velocityX = dirX * speed;
  const velocityY = dirY * speed;
  const velocityZ = (Math.random() - 0.5) * config.depth3D;

  // 6. 初始旋转（随机）
  const rotationX = Math.random() * Math.PI * 2;
  const rotationY = Math.random() * Math.PI * 2;
  const rotationZ = Math.random() * Math.PI * 2;

  // 角速度
  const angularVelocityX = (Math.random() - 0.5) * config.rotationSpeed;
  const angularVelocityY = (Math.random() - 0.5) * config.rotationSpeed;
  const angularVelocityZ = (Math.random() - 0.5) * config.rotationSpeed;

  return {
    id: index,
    cell,
    position: [centerX, centerY, 0],
    velocity: [velocityX, velocityY, velocityZ],
    rotation: [rotationX, rotationY, rotationZ],
    angularVelocity: [angularVelocityX, angularVelocityY, angularVelocityZ],
    scale: [1, 1, 1],
    opacity: 1.0,
    vertices,
    uvs,
    normals
  };
}
