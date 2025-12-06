/**
 * 真实裂纹生成系统 (Pure JavaScript)
 * 基于物理应力传播模拟生成真实的玻璃裂纹效果
 */

/**
 * 生成真实的玻璃裂纹系统
 */
export function generateRealisticCracks(impactPoints, bounds, options) {
  const allCracks = [];
  
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
function generateMainCracks(impact, bounds, options) {
  const cracks = [];
  const count = Math.floor(options.mainCrackCount * options.density);
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const crack = generateCrackBranch(
      impact,
      angle,
      options.maxLength * (0.6 + Math.random() * 0.4),
      options.maxWidth,
      0,
      0,
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
function generateSecondaryCracks(mainCracks, bounds, options) {
  const cracks = [];
  
  mainCracks.forEach(mainCrack => {
    mainCrack.segments.forEach((segment, idx) => {
      if (Math.random() < options.branchProbability && idx % 2 === 0) {
        const midPoint = {
          x: (segment.start.x + segment.end.x) / 2,
          y: (segment.start.y + segment.end.y) / 2
        };
        
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const mainAngle = Math.atan2(dy, dx);
        
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
            1,
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
function generateMicroCracks(impact, bounds, options) {
  const cracks = [];
  const count = Math.floor(20 * options.density);
  const radius = Math.min(bounds.width, bounds.height) * 0.15;
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const start = {
      x: impact.x + Math.cos(angle) * dist,
      y: impact.y + Math.sin(angle) * dist
    };
    
    const crackAngle = Math.random() * Math.PI * 2;
    const length = 10 + Math.random() * 20;
    
    const segments = [{
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
function generateCrackBranch(start, angle, maxLength, maxWidth, layer, generation, bounds, options) {
  const segments = [];
  const segmentCount = 5 + Math.floor(Math.random() * 5);
  const segmentLength = maxLength / segmentCount;
  
  let currentPoint = { ...start };
  let currentAngle = angle;
  let remainingLength = maxLength;
  
  for (let i = 0; i < segmentCount && remainingLength > 0; i++) {
    currentAngle += (Math.random() - 0.5) * 0.3;
    
    const actualLength = Math.min(segmentLength * (0.8 + Math.random() * 0.4), remainingLength);
    const nextPoint = {
      x: currentPoint.x + Math.cos(currentAngle) * actualLength,
      y: currentPoint.y + Math.sin(currentAngle) * actualLength
    };
    
    if (nextPoint.x < -50 || nextPoint.x > bounds.width + 50 ||
        nextPoint.y < -50 || nextPoint.y > bounds.height + 50) {
      break;
    }
    
    const widthRatio = 1 - (i / segmentCount);
    const width = options.minWidth + (maxWidth - options.minWidth) * widthRatio;
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
 * 裂纹动画数据生成器
 */
export function generateCrackGrowthAnimation(cracks, duration) {
  const segmentTimings = [];
  
  let totalSegments = 0;
  cracks.forEach(crack => {
    totalSegments += crack.segments.length;
  });
  
  let segmentIndex = 0;
  cracks.forEach(crack => {
    crack.segments.forEach(segment => {
      const baseTime = (segmentIndex / totalSegments) * duration;
      const generationDelay = segment.generation * 50;
      const layerDelay = segment.layer * 100;
      
      const startTime = baseTime + generationDelay + layerDelay;
      const growthDuration = 100 + Math.random() * 100;
      
      segmentTimings.push({
        segment,
        startTime,
        endTime: startTime + growthDuration
      });
      
      segmentIndex++;
    });
  });
  
  return (time) => {
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

