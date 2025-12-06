/**
 * 真实裂纹生成系统
 * 基于物理应力传播模拟生成真实的玻璃裂纹效果
 */

export interface Point {
  x: number;
  y: number;
}

export interface CrackSegment {
  start: Point;
  end: Point;
  width: number;
  opacity: number;
  layer: number; // 0=主裂纹, 1=次级, 2=微裂纹
  generation: number; // 生成代数
}

export interface CrackLine {
  segments: CrackSegment[];
  mainBranch: boolean;
}

export interface CrackGenerationOptions {
  layers: number; // 1-3层
  density: number; // 0.5-2.0 裂纹密度
  mainCrackCount: number; // 主裂纹数量
  branchProbability: number; // 分支概率 0-1
  minWidth: number; // 最小宽度
  maxWidth: number; // 最大宽度
  maxLength: number; // 最大长度
  glowIntensity: number; // 发光强度
  shadowDepth: number; // 阴影深度
}

/**
 * 生成真实的玻璃裂纹系统
 */
export function generateRealisticCracks(
  impactPoints: Point[], // 冲击点（用户抓取位置）
  bounds: { width: number; height: number },
  options: CrackGenerationOptions
): CrackLine[] {
  const allCracks: CrackLine[] = [];
  
  // 为每个冲击点生成裂纹系统
  impactPoints.forEach(impact => {
    // 第一层：主裂纹（从冲击点辐射）
    const mainCracks = generateMainCracks(impact, bounds, options);
    allCracks.push(...mainCracks);
    
    // 第二层：次级裂纹（从主裂纹分支）
    if (options.layers >= 2) {
      const secondaryCracks = generateSecondaryCracks(mainCracks, bounds, options);
      allCracks.push(...secondaryCracks);
    }
    
    // 第三层：微裂纹（细节纹理）
    if (options.layers >= 3) {
      const microCracks = generateMicroCracks(impact, bounds, options);
      allCracks.push(...microCracks);
    }
  });
  
  return allCracks;
}

/**
 * 生成主裂纹（从冲击点辐射状扩散）
 */
function generateMainCracks(
  impact: Point,
  bounds: { width: number; height: number },
  options: CrackGenerationOptions
): CrackLine[] {
  const cracks: CrackLine[] = [];
  const count = Math.floor(options.mainCrackCount * options.density);
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const crack = generateCrackBranch(
      impact,
      angle,
      options.maxLength * (0.6 + Math.random() * 0.4),
      options.maxWidth,
      0, // 第一层
      0, // 第0代
      bounds,
      options
    );
    
    if (crack.length > 0) {
      cracks.push({
        segments: crack,
        mainBranch: true
      });
    }
  }
  
  return cracks;
}

/**
 * 生成次级裂纹（从主裂纹分支）
 */
function generateSecondaryCracks(
  mainCracks: CrackLine[],
  bounds: { width: number; height: number },
  options: CrackGenerationOptions
): CrackLine[] {
  const cracks: CrackLine[] = [];
  
  mainCracks.forEach(mainCrack => {
    mainCrack.segments.forEach((segment, idx) => {
      // 随机决定是否在这个段上生成分支
      if (Math.random() < options.branchProbability && idx % 2 === 0) {
        // 从段的中点生成分支
        const midPoint = {
          x: (segment.start.x + segment.end.x) / 2,
          y: (segment.start.y + segment.end.y) / 2
        };
        
        // 计算垂直方向
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const mainAngle = Math.atan2(dy, dx);
        
        // 生成两个分支（左右各一个）
        const branchAngles = [
          mainAngle + Math.PI / 4 + (Math.random() - 0.5) * 0.3,
          mainAngle - Math.PI / 4 + (Math.random() - 0.5) * 0.3
        ];
        
        branchAngles.forEach(angle => {
          const branchLength = options.maxLength * 0.3 * (0.5 + Math.random() * 0.5);
          const branch = generateCrackBranch(
            midPoint,
            angle,
            branchLength,
            options.maxWidth * 0.6,
            1, // 第二层
            segment.generation + 1,
            bounds,
            options
          );
          
          if (branch.length > 0) {
            cracks.push({
              segments: branch,
              mainBranch: false
            });
          }
        });
      }
    });
  });
  
  return cracks;
}

/**
 * 生成微裂纹（细节纹理）
 */
function generateMicroCracks(
  impact: Point,
  bounds: { width: number; height: number },
  options: CrackGenerationOptions
): CrackLine[] {
  const cracks: CrackLine[] = [];
  const count = Math.floor(20 * options.density);
  const radius = Math.min(bounds.width, bounds.height) * 0.15;
  
  for (let i = 0; i < count; i++) {
    // 在冲击点周围随机位置
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const start = {
      x: impact.x + Math.cos(angle) * dist,
      y: impact.y + Math.sin(angle) * dist
    };
    
    // 短小的裂纹
    const crackAngle = Math.random() * Math.PI * 2;
    const length = 10 + Math.random() * 20;
    
    const segments: CrackSegment[] = [{
      start,
      end: {
        x: start.x + Math.cos(crackAngle) * length,
        y: start.y + Math.sin(crackAngle) * length
      },
      width: options.minWidth * 0.5,
      opacity: 0.3 + Math.random() * 0.3,
      layer: 2,
      generation: 0
    }];
    
    cracks.push({
      segments,
      mainBranch: false
    });
  }
  
  return cracks;
}

/**
 * 生成单条裂纹分支（递归）
 */
function generateCrackBranch(
  start: Point,
  angle: number,
  maxLength: number,
  maxWidth: number,
  layer: number,
  generation: number,
  bounds: { width: number; height: number },
  options: CrackGenerationOptions
): CrackSegment[] {
  const segments: CrackSegment[] = [];
  const segmentCount = 5 + Math.floor(Math.random() * 5);
  const segmentLength = maxLength / segmentCount;
  
  let currentPoint = { ...start };
  let currentAngle = angle;
  let remainingLength = maxLength;
  
  for (let i = 0; i < segmentCount && remainingLength > 0; i++) {
    // 添加随机扰动（裂纹不是完全直的）
    currentAngle += (Math.random() - 0.5) * 0.3;
    
    // 计算下一个点
    const actualLength = Math.min(segmentLength * (0.8 + Math.random() * 0.4), remainingLength);
    const nextPoint = {
      x: currentPoint.x + Math.cos(currentAngle) * actualLength,
      y: currentPoint.y + Math.sin(currentAngle) * actualLength
    };
    
    // 检查边界
    if (nextPoint.x < -50 || nextPoint.x > bounds.width + 50 ||
        nextPoint.y < -50 || nextPoint.y > bounds.height + 50) {
      break;
    }
    
    // 计算宽度（从粗到细，模拟应力衰减）
    const widthRatio = 1 - (i / segmentCount);
    const width = options.minWidth + (maxWidth - options.minWidth) * widthRatio;
    
    // 计算透明度
    const opacity = 0.5 + widthRatio * 0.4;
    
    segments.push({
      start: { ...currentPoint },
      end: { ...nextPoint },
      width,
      opacity,
      layer,
      generation
    });
    
    currentPoint = nextPoint;
    remainingLength -= actualLength;
  }
  
  return segments;
}

/**
 * 生成裂纹的阴影效果数据
 */
export interface CrackShadow {
  segment: CrackSegment;
  offset: Point;
  blur: number;
}

export function generateCrackShadows(
  cracks: CrackLine[],
  shadowDepth: number
): CrackShadow[] {
  const shadows: CrackShadow[] = [];
  
  cracks.forEach(crack => {
    crack.segments.forEach(segment => {
      // 只为主要裂纹生成阴影
      if (segment.layer === 0 && segment.width > 2) {
        shadows.push({
          segment,
          offset: {
            x: 1,
            y: shadowDepth
          },
          blur: shadowDepth * 0.5
        });
      }
    });
  });
  
  return shadows;
}

/**
 * 生成裂纹的高光效果数据
 */
export interface CrackHighlight {
  segment: CrackSegment;
  side: 'left' | 'right';
  intensity: number;
}

export function generateCrackHighlights(
  cracks: CrackLine[],
  lightDirection: Point // 归一化的光照方向
): CrackHighlight[] {
  const highlights: CrackHighlight[] = [];
  
  cracks.forEach(crack => {
    crack.segments.forEach(segment => {
      // 计算裂纹方向
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return;
      
      const normal = {
        x: -dy / length,
        y: dx / length
      };
      
      // 计算光照强度
      const dotProduct = normal.x * lightDirection.x + normal.y * lightDirection.y;
      
      if (dotProduct > 0) {
        highlights.push({
          segment,
          side: 'right',
          intensity: dotProduct * 0.8
        });
      } else if (dotProduct < 0) {
        highlights.push({
          segment,
          side: 'left',
          intensity: -dotProduct * 0.8
        });
      }
    });
  });
  
  return highlights;
}

/**
 * 裂纹动画数据生成器
 * 用于实现裂纹逐渐生长的动画效果
 */
export interface CrackGrowthFrame {
  visibleSegments: Array<{
    segment: CrackSegment;
    progress: number; // 0-1，该段的生长进度
  }>;
  totalProgress: number; // 0-1，整体进度
}

export function generateCrackGrowthAnimation(
  cracks: CrackLine[],
  duration: number // 毫秒
): (time: number) => CrackGrowthFrame {
  // 计算每个segment的出现时间
  const segmentTimings: Array<{
    segment: CrackSegment;
    startTime: number;
    endTime: number;
  }> = [];
  
  let totalSegments = 0;
  cracks.forEach(crack => {
    totalSegments += crack.segments.length;
  });
  
  let segmentIndex = 0;
  cracks.forEach(crack => {
    crack.segments.forEach(segment => {
      // 根据生成代数和层级决定出现时间
      const baseTime = (segmentIndex / totalSegments) * duration;
      const generationDelay = segment.generation * 50; // 每代延迟50ms
      const layerDelay = segment.layer * 100; // 每层延迟100ms
      
      const startTime = baseTime + generationDelay + layerDelay;
      const growthDuration = 100 + Math.random() * 100; // 每段生长时间100-200ms
      
      segmentTimings.push({
        segment,
        startTime,
        endTime: startTime + growthDuration
      });
      
      segmentIndex++;
    });
  });
  
  // 返回动画查询函数
  return (time: number): CrackGrowthFrame => {
    const visibleSegments = segmentTimings
      .filter(timing => time >= timing.startTime)
      .map(timing => ({
        segment: timing.segment,
        progress: Math.min(1, (time - timing.startTime) / (timing.endTime - timing.startTime))
      }));
    
    return {
      visibleSegments,
      totalProgress: Math.min(1, time / duration)
    };
  };
}

