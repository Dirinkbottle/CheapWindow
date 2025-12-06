/**
 * Voronoi 图生成器 (Pure JavaScript)
 * 用于生成真实的碎片裂纹图案
 */

/**
 * 生成 Voronoi 图
 */
export function generateVoronoiDiagram(userVectors, options) {
  const { width, height, subdivisions = 0, perturbation = 0 } = options;
  
  if (userVectors.length === 0) {
    return [];
  }

  // 转换用户位置为站点
  const sites = [];
  
  userVectors.forEach(({ userId, position, force }) => {
    // 从百分比转换为像素
    const baseX = (position.x / 100) * width;
    const baseY = (position.y / 100) * height;
    
    // 添加主站点
    sites.push({
      x: baseX + (Math.random() - 0.5) * perturbation,
      y: baseY + (Math.random() - 0.5) * perturbation,
      userId,
      force
    });
    
    // 根据力量添加细分站点
    const subCount = Math.floor(subdivisions * (force / 2));
    for (let i = 0; i < subCount; i++) {
      const angle = (Math.PI * 2 * i) / subCount;
      const radius = Math.min(width, height) * 0.1 * force;
      sites.push({
        x: baseX + Math.cos(angle) * radius + (Math.random() - 0.5) * perturbation,
        y: baseY + Math.sin(angle) * radius + (Math.random() - 0.5) * perturbation,
        userId,
        force
      });
    }
  });

  // Lloyd 松弛以获得更好的分布
  const relaxedSites = relaxSites(sites, width, height, 1);

  // 计算 Voronoi 单元格
  const cells = computeVoronoiCells(relaxedSites, width, height);

  return cells;
}

/**
 * Lloyd 松弛 - 将站点移动到质心以获得更好的分布
 */
function relaxSites(sites, width, height, iterations) {
  let currentSites = [...sites];
  
  for (let iter = 0; iter < iterations; iter++) {
    const newSites = [];
    
    currentSites.forEach(site => {
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      
      const sampleRadius = Math.min(width, height) * 0.15;
      const samples = 20;
      
      for (let i = 0; i < samples; i++) {
        const angle = (Math.PI * 2 * i) / samples;
        const testX = site.x + Math.cos(angle) * sampleRadius;
        const testY = site.y + Math.sin(angle) * sampleRadius;
        
        if (isClosestSite(testX, testY, site, currentSites)) {
          sumX += testX;
          sumY += testY;
          count++;
        }
      }
      
      if (count > 0) {
        newSites.push({
          ...site,
          x: sumX / count,
          y: sumY / count
        });
      } else {
        newSites.push(site);
      }
    });
    
    currentSites = newSites;
  }
  
  return currentSites;
}

/**
 * 检查点是否最接近给定站点
 */
function isClosestSite(x, y, site, allSites) {
  const distToSite = Math.hypot(x - site.x, y - site.y);
  
  for (const otherSite of allSites) {
    if (otherSite === site) continue;
    const distToOther = Math.hypot(x - otherSite.x, y - otherSite.y);
    if (distToOther < distToSite) {
      return false;
    }
  }
  
  return true;
}

/**
 * 计算 Voronoi 单元格
 */
function computeVoronoiCells(sites, width, height) {
  const cells = new Map();
  
  // 初始化单元格
  sites.forEach(site => {
    const key = `${site.userId}-${site.x}-${site.y}`;
    cells.set(key, {
      site: { x: site.x, y: site.y },
      polygon: [],
      userId: site.userId,
      force: site.force
    });
  });

  // 使用边缘跟踪生成单元格多边形
  sites.forEach(site => {
    const key = `${site.userId}-${site.x}-${site.y}`;
    const polygon = traceCellBoundary(site, sites, width, height);
    const cell = cells.get(key);
    cell.polygon = polygon;
  });

  return Array.from(cells.values());
}

/**
 * 跟踪 Voronoi 单元格的边界
 */
function traceCellBoundary(site, allSites, width, height) {
  const polygon = [];
  const segments = 32;
  
  // 从站点开始径向向外采样
  for (let i = 0; i < segments; i++) {
    const angle = (Math.PI * 2 * i) / segments;
    
    // 沿此射线二分查找单元格边界
    let low = 0;
    let high = Math.max(width, height) * 1.5;
    
    for (let iter = 0; iter < 10; iter++) {
      const mid = (low + high) / 2;
      const testX = site.x + Math.cos(angle) * mid;
      const testY = site.y + Math.sin(angle) * mid;
      
      if (isClosestSite(testX, testY, site, allSites)) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    const boundaryX = site.x + Math.cos(angle) * low;
    const boundaryY = site.y + Math.sin(angle) * low;
    
    // 裁剪到边界
    polygon.push({
      x: Math.max(0, Math.min(width, boundaryX)),
      y: Math.max(0, Math.min(height, boundaryY))
    });
  }
  
  return simplifyPolygon(polygon, width * 0.02);
}

/**
 * 使用 Douglas-Peucker 算法简化多边形
 */
function simplifyPolygon(points, tolerance) {
  if (points.length <= 3) return points;
  
  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  if (maxDistance > tolerance) {
    const left = simplifyPolygon(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolygon(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [first, last];
  }
}

/**
 * 计算点到线的垂直距离
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq
  ));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * 快速 Voronoi 生成（简化版）
 */
export function generateVoronoiFast(userVectors, options) {
  const { width, height } = options;
  
  if (userVectors.length === 0) return [];
  if (userVectors.length === 1) {
    return [{
      site: {
        x: (userVectors[0].position.x / 100) * width,
        y: (userVectors[0].position.y / 100) * height
      },
      polygon: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
      ],
      userId: userVectors[0].userId,
      force: userVectors[0].force
    }];
  }
  
  return generateVoronoiDiagram(userVectors, options);
}

/**
 * 生成单元格之间的裂纹线
 */
export function generateCrackLines(cells) {
  const cracks = [];
  
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const cell1 = cells[i];
      const cell2 = cells[j];
      
      const sharedPoints = findSharedEdge(cell1.polygon, cell2.polygon);
      if (sharedPoints.length >= 2) {
        for (let k = 0; k < sharedPoints.length - 1; k++) {
          cracks.push([sharedPoints[k], sharedPoints[k + 1]]);
        }
      }
    }
  }
  
  return cracks;
}

/**
 * 查找两个多边形之间的共享边
 */
function findSharedEdge(poly1, poly2) {
  const shared = [];
  const threshold = 5;
  
  for (const p1 of poly1) {
    for (const p2 of poly2) {
      if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < threshold) {
        if (!shared.some(p => Math.hypot(p.x - p1.x, p.y - p1.y) < threshold)) {
          shared.push(p1);
        }
      }
    }
  }
  
  return shared;
}

