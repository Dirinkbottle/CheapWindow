/**
 * 撕裂动画组件 - 完全重构版本
 * 支持三种动画风格：逐渐破裂、拉扯、粉碎
 * 支持三种性能模式：高质量、平衡、性能优先
 */
import React, { useEffect, useRef } from 'react';
import type { WindowData, ContestedData, Point, Settings } from '../types';

interface TearEffectProps {
  window: WindowData;
  contestData: ContestedData;
  userVectors: Map<string, { position: Point; force: number }>;
  pixelPosition: Point;
  settings: Settings;
  onComplete: () => void;
}

interface Crack {
  points: Point[];
  width: number;
  opacity: number;
}

interface Fragment {
  id: number;
  points: Point[]; // 多边形顶点
  center: Point;
  velocity: Point;
  acceleration: Point;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  elapsedTime: number;
  userId?: string;
}

interface Particle {
  position: Point;
  velocity: Point;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const TearEffect: React.FC<TearEffectProps> = ({
  window,
  contestData,
  userVectors,
  pixelPosition,
  settings,
  onComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const fragmentsRef = useRef<Fragment[]>([]);
  const cracksRef = useRef<Crack[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const isTornRef = useRef<boolean>(false);

  // 解析配置
  const animationStyle = settings?.tear_animation_style || 'shatter';
  const performanceMode = settings?.tear_performance_mode || 'balanced';
  const crackStartRatio = parseFloat(settings?.tear_crack_start_ratio || '0.33');
  const fragmentLifetime = parseInt(settings?.tear_fragment_lifetime || '3000');
  const fragmentFadeDuration = parseInt(settings?.tear_fragment_fade_duration || '1000');
  const enableRotation = settings?.tear_enable_rotation === '1';
  // const enableScale = settings?.tear_enable_scale === '1'; // 保留供将来使用
  const particleCount = parseInt(settings?.tear_particle_count || '50');
  const enableBlur = settings?.tear_enable_blur === '1' && performanceMode === 'high';
  const enableGlow = settings?.tear_enable_glow === '1' && performanceMode === 'high';
  // const animationDuration = parseInt(settings?.tear_animation_duration || '1500') / 1000; // 保留供将来使用

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置 canvas 尺寸
    const width = window.size.width;
    const height = window.size.height;
    canvas.width = width * 2; // 2x for retina
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // 动画循环
    const animate = () => {
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000; // 秒
      const dt = 0.016; // 假设 60fps

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 如果尚未撕裂（倒计时阶段）
      if (!isTornRef.current && contestData) {
        const progress = contestData.progress || 0;
        
        // 绘制窗口背景
        ctx.fillStyle = window.colors.bg;
        ctx.fillRect(0, 0, width, height);
        
        // 绘制窗口内容
        ctx.fillStyle = window.colors.text;
        ctx.font = `${window.fontSize}px Microsoft YaHei`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(window.message, width / 2, height / 2);

        // 如果进度超过裂纹开始比例，生成并绘制裂纹
        if (progress >= crackStartRatio) {
          updateCracks(progress, width, height);
          renderCracks(ctx, width, height);
        }

        // 检查是否应该撕裂
        if (progress >= 0.99 && !isTornRef.current) {
          isTornRef.current = true;
          fragmentsRef.current = generateFragments(width, height);
          startTimeRef.current = now; // 重置时间用于碎片动画
          
          // 生成粒子效果（高质量模式）
          if (performanceMode === 'high') {
            generateParticles(width, height);
          }
        }
      } 
      // 撕裂后阶段 - 碎片动画
      else if (isTornRef.current) {
        updateFragments(dt);
        renderFragments(ctx);

        // 更新和渲染粒子
        if (performanceMode === 'high') {
          updateParticles(dt);
          renderParticles(ctx);
        }

        // 检查动画是否完成
        if (elapsed > fragmentLifetime / 1000) {
          onComplete();
          return;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [window, contestData, userVectors, settings, onComplete]);

  /**
   * 更新裂纹
   */
  const updateCracks = (progress: number, width: number, height: number) => {
    if (cracksRef.current.length > 0) return; // 只生成一次

    const crackProgress = (progress - crackStartRatio) / (1 - crackStartRatio);
    let crackCount = 0;

    // 根据性能模式确定裂纹数量
    if (performanceMode === 'high') {
      crackCount = Math.floor(20 + crackProgress * 10);
    } else if (performanceMode === 'balanced') {
      crackCount = Math.floor(10 + crackProgress * 5);
    } else {
      crackCount = Math.floor(5 + crackProgress * 3);
    }

    // 根据动画风格生成裂纹
    if (animationStyle === 'gradual') {
      cracksRef.current = generateGradualCracks(crackCount, width, height);
    } else if (animationStyle === 'stretch') {
      cracksRef.current = generateStretchCracks(crackCount, width, height);
    } else {
      cracksRef.current = generateShatterCracks(crackCount, width, height);
    }
  };

  /**
   * 生成逐渐破裂风格的裂纹
   */
  const generateGradualCracks = (count: number, width: number, height: number): Crack[] => {
    const cracks: Crack[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const length = Math.min(width, height) * (0.3 + Math.random() * 0.4);
      
      const crack: Crack = {
        points: [],
        width: 1 + Math.random() * 2,
        opacity: 0.5 + Math.random() * 0.5
      };

      // 从中心向外生成锯齿路径
      const segments = 5 + Math.floor(Math.random() * 5);
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const currentLength = length * t;
        const x = centerX + Math.cos(angle) * currentLength + (Math.random() - 0.5) * 10;
        const y = centerY + Math.sin(angle) * currentLength + (Math.random() - 0.5) * 10;
        crack.points.push({ x, y });
      }

      cracks.push(crack);
    }

    return cracks;
  };

  /**
   * 生成拉扯风格的裂纹
   */
  const generateStretchCracks = (count: number, width: number, height: number): Crack[] => {
    const cracks: Crack[] = [];
    const users = Array.from(userVectors.entries());

    if (users.length === 0) return generateShatterCracks(count, width, height);

    // 为每个用户生成沿其拖动方向的裂纹
    users.forEach(([_userId, vector]) => {
      const cracksPerUser = Math.floor(count / users.length);
      
      for (let i = 0; i < cracksPerUser; i++) {
        const crack: Crack = {
          points: [],
          width: 1.5 + Math.random() * 2,
          opacity: 0.6 + Math.random() * 0.4
        };

        // 从窗口中心沿用户向量方向生成裂纹
        const startX = width / 2;
        const startY = height / 2;
        const dirX = vector.position.x - 50; // 转换为相对中心的方向
        const dirY = vector.position.y - 50;
        const length = Math.sqrt(dirX * dirX + dirY * dirY) * 3;

        const segments = 4 + Math.floor(Math.random() * 4);
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const x = startX + dirX * t * length / 50 + (Math.random() - 0.5) * 15;
          const y = startY + dirY * t * length / 50 + (Math.random() - 0.5) * 15;
          crack.points.push({ x, y });
        }

        cracks.push(crack);
      }
    });

    return cracks;
  };

  /**
   * 生成粉碎风格的裂纹（蛛网状）
   */
  const generateShatterCracks = (count: number, width: number, height: number): Crack[] => {
    const cracks: Crack[] = [];

    // 生成主裂纹（从多个起点放射）
    const origins = [];
    const originCount = Math.min(3 + Math.floor(count / 8), 6);
    for (let i = 0; i < originCount; i++) {
      origins.push({
        x: width * (0.2 + Math.random() * 0.6),
        y: height * (0.2 + Math.random() * 0.6)
      });
    }

    origins.forEach(origin => {
      const cracksFromOrigin = Math.floor(count / origins.length);
      for (let i = 0; i < cracksFromOrigin; i++) {
        const crack: Crack = {
          points: [],
          width: 1 + Math.random() * 2.5,
          opacity: 0.4 + Math.random() * 0.6
        };

        const angle = (Math.PI * 2 * i) / cracksFromOrigin;
        const length = Math.min(width, height) * (0.2 + Math.random() * 0.5);

        const segments = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const x = origin.x + Math.cos(angle) * length * t + (Math.random() - 0.5) * 20;
          const y = origin.y + Math.sin(angle) * length * t + (Math.random() - 0.5) * 20;
          crack.points.push({ x, y });
        }

        cracks.push(crack);
      }
    });

    return cracks;
  };

  /**
   * 渲染裂纹
   */
  const renderCracks = (ctx: CanvasRenderingContext2D, _width: number, _height: number) => {
    cracksRef.current.forEach(crack => {
      if (crack.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(crack.points[0].x, crack.points[0].y);
      
      for (let i = 1; i < crack.points.length; i++) {
        ctx.lineTo(crack.points[i].x, crack.points[i].y);
      }

      ctx.strokeStyle = `rgba(0, 0, 0, ${crack.opacity})`;
      ctx.lineWidth = crack.width;
      ctx.stroke();

      // 高质量模式：添加发光效果
      if (enableGlow) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${crack.opacity * 0.3})`;
        ctx.lineWidth = crack.width + 2;
        ctx.stroke();
      }
    });
  };

  /**
   * 生成碎片
   */
  const generateFragments = (width: number, height: number): Fragment[] => {
    const fragments: Fragment[] = [];
    const users = Array.from(userVectors.entries());
    const fragmentCount = users.length;

    // 根据用户数量将窗口分割成碎片
    if (fragmentCount === 2) {
      // 2人：左右分割
      fragments.push(
        createFragment(0, [
          { x: 0, y: 0 },
          { x: width / 2, y: 0 },
          { x: width / 2, y: height },
          { x: 0, y: height }
        ], users[0]),
        createFragment(1, [
          { x: width / 2, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: width / 2, y: height }
        ], users[1])
      );
    } else if (fragmentCount === 3) {
      // 3人：三角形分割
      fragments.push(
        createFragment(0, [
          { x: width / 2, y: 0 },
          { x: width, y: height },
          { x: 0, y: height }
        ], users[0]),
        createFragment(1, [
          { x: 0, y: 0 },
          { x: width / 2, y: 0 },
          { x: 0, y: height }
        ], users[1]),
        createFragment(2, [
          { x: width / 2, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height }
        ], users[2])
      );
    } else {
      // 4+人：放射状分割
      const centerX = width / 2;
      const centerY = height / 2;
      const angleStep = (Math.PI * 2) / fragmentCount;

      for (let i = 0; i < fragmentCount; i++) {
        const angle1 = angleStep * i;
        const angle2 = angleStep * (i + 1);
        const radius = Math.max(width, height);

        fragments.push(createFragment(i, [
          { x: centerX, y: centerY },
          { x: centerX + Math.cos(angle1) * radius, y: centerY + Math.sin(angle1) * radius },
          { x: centerX + Math.cos(angle2) * radius, y: centerY + Math.sin(angle2) * radius }
        ], users[i % users.length]));
      }
    }

    return fragments;
  };

  /**
   * 创建单个碎片
   */
  const createFragment = (id: number, points: Point[], user: [string, { position: Point; force: number }]): Fragment => {
    const [userId, vector] = user;
    
    // 计算碎片中心
    const center = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length
    };

    // 计算速度（基于用户向量）
    const dirX = vector.position.x - 50;
    const dirY = vector.position.y - 50;
    const speed = 100 * vector.force;
    const length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

    return {
      id,
      points: points.map(p => ({ ...p })),
      center,
      velocity: {
        x: (dirX / length) * speed,
        y: (dirY / length) * speed
      },
      acceleration: { x: 0, y: 200 }, // 重力
      rotation: 0,
      rotationSpeed: enableRotation ? (Math.random() - 0.5) * 4 : 0,
      opacity: 1,
      elapsedTime: 0,
      userId
    };
  };

  /**
   * 更新碎片
   */
  const updateFragments = (dt: number) => {
    fragmentsRef.current.forEach(fragment => {
      fragment.elapsedTime += dt * 1000; // 转为毫秒

      // 更新速度
      fragment.velocity.x += fragment.acceleration.x * dt;
      fragment.velocity.y += fragment.acceleration.y * dt;

      // 更新位置
      const deltaX = fragment.velocity.x * dt;
      const deltaY = fragment.velocity.y * dt;
        fragment.points = fragment.points.map(p => ({
        x: p.x + deltaX,
        y: p.y + deltaY
      }));
      fragment.center.x += deltaX;
      fragment.center.y += deltaY;

      // 更新旋转
      fragment.rotation += fragment.rotationSpeed * dt;

      // 更新透明度（淡出）
      const fadeStartTime = fragmentLifetime - fragmentFadeDuration;
      if (fragment.elapsedTime > fadeStartTime) {
        const fadeProgress = (fragment.elapsedTime - fadeStartTime) / fragmentFadeDuration;
        fragment.opacity = Math.max(0, 1 - fadeProgress);
      }
    });
  };

  /**
   * 渲染碎片
   */
  const renderFragments = (ctx: CanvasRenderingContext2D) => {
    fragmentsRef.current.forEach(fragment => {
      if (fragment.opacity <= 0) return;

      ctx.save();
      ctx.globalAlpha = fragment.opacity;

      // 应用旋转
      ctx.translate(fragment.center.x, fragment.center.y);
        ctx.rotate(fragment.rotation);
      ctx.translate(-fragment.center.x, -fragment.center.y);

        // 绘制碎片
        ctx.beginPath();
      ctx.moveTo(fragment.points[0].x, fragment.points[0].y);
      for (let i = 1; i < fragment.points.length; i++) {
        ctx.lineTo(fragment.points[i].x, fragment.points[i].y);
        }
        ctx.closePath();

      // 填充
        ctx.fillStyle = window.colors.bg;
        ctx.fill();

        // 描边
        ctx.strokeStyle = window.colors.text;
        ctx.lineWidth = 2;
        ctx.stroke();

      // 绘制文字（简化版本）
      ctx.fillStyle = window.colors.text;
          ctx.font = `${window.fontSize}px Microsoft YaHei`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
      ctx.fillText(window.message.substring(0, 3), fragment.center.x, fragment.center.y);

      // 高质量模式：添加模糊效果
      if (enableBlur) {
        ctx.filter = `blur(${(1 - fragment.opacity) * 3}px)`;
      }

      ctx.restore();
    });
  };

  /**
   * 生成粒子
   */
  const generateParticles = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      
      particlesRef.current.push({
        position: { x: centerX, y: centerY },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: window.colors.text
      });
    }
  };

  /**
   * 更新粒子
   */
  const updateParticles = (dt: number) => {
    particlesRef.current = particlesRef.current.filter(particle => {
      particle.life -= dt / particle.maxLife;
      if (particle.life <= 0) return false;

      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      particle.velocity.y += 200 * dt; // 重力

      return true;
    });
  };

  /**
   * 渲染粒子
   */
  const renderParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(particle => {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        left: `${pixelPosition.x}px`,
        top: `${pixelPosition.y}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 2000,
        width: `${window.size.width}px`,
        height: `${window.size.height}px`
      }}
    />
  );
};
