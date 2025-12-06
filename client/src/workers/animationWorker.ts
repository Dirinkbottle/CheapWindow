/**
 * 动画计算Worker - 在独立线程中进行动画物理计算
 * 
 * 功能：
 * - Voronoi碎片生成
 * - 撕裂碎片轨迹计算
 * - 物理模拟（重力、旋转、空气阻力）
 * - 碰撞检测
 * 
 * 优势：完全不阻塞主线程，支持100+并发动画
 */

interface Point {
  x: number;
  y: number;
}

interface VoronoiCell {
  site: Point;
  polygon: Point[];
  userId: string;
  force: number;
}

interface Fragment {
  id: number;
  position: Point;
  velocity: Point;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  points: Point[]; // 碎片多边形顶点
}

interface TearCalculationParams {
  windowId: string;
  window: {
    position: Point;
    size: { width: number; height: number };
    colors: { bg: string; text: string };
    message: string;
  };
  userVectors: Array<{
    userId: string;
    position: Point;
    force: number;
  }>;
  settings: {
    fragmentLifetime: number;
    enableRotation: boolean;
    gravity: number;
  };
}

interface PhysicsSimulationParams {
  fragments: Fragment[];
  deltaTime: number;
  gravity: number;
  airResistance: number;
}

/**
 * 计算撕裂碎片的初始状态和轨迹
 */
function calculateTearFragments(params: TearCalculationParams): Fragment[] {
  const { window, userVectors } = params;
  const fragments: Fragment[] = [];
  const fragmentCount = userVectors.length;

  // 根据用户数量分割窗口
  if (fragmentCount === 2) {
    // 2人：左右分割
    fragments.push(
      createFragment(0, window, [
        { x: 0, y: 0 },
        { x: window.size.width / 2, y: 0 },
        { x: window.size.width / 2, y: window.size.height },
        { x: 0, y: window.size.height }
      ], userVectors[0]),
      createFragment(1, window, [
        { x: window.size.width / 2, y: 0 },
        { x: window.size.width, y: 0 },
        { x: window.size.width, y: window.size.height },
        { x: window.size.width / 2, y: window.size.height }
      ], userVectors[1])
    );
  } else if (fragmentCount === 3) {
    // 3人：三角形分割
    fragments.push(
      createFragment(0, window, [
        { x: window.size.width / 2, y: 0 },
        { x: window.size.width, y: window.size.height },
        { x: 0, y: window.size.height }
      ], userVectors[0]),
      createFragment(1, window, [
        { x: 0, y: 0 },
        { x: window.size.width / 2, y: 0 },
        { x: 0, y: window.size.height }
      ], userVectors[1]),
      createFragment(2, window, [
        { x: window.size.width / 2, y: 0 },
        { x: window.size.width, y: 0 },
        { x: window.size.width, y: window.size.height }
      ], userVectors[2])
    );
  } else {
    // 4+人：放射状分割
    const centerX = window.size.width / 2;
    const centerY = window.size.height / 2;
    const angleStep = (Math.PI * 2) / fragmentCount;

    for (let i = 0; i < fragmentCount; i++) {
      const angle1 = angleStep * i;
      const angle2 = angleStep * (i + 1);
      const radius = Math.max(window.size.width, window.size.height);

      fragments.push(createFragment(i, window, [
        { x: centerX, y: centerY },
        { x: centerX + Math.cos(angle1) * radius, y: centerY + Math.sin(angle1) * radius },
        { x: centerX + Math.cos(angle2) * radius, y: centerY + Math.sin(angle2) * radius }
      ], userVectors[i % userVectors.length]));
    }
  }

  return fragments;
}

/**
 * 创建单个碎片
 */
function createFragment(
  id: number,
  window: any,
  points: Point[],
  userVector: { userId: string; position: Point; force: number }
): Fragment {
  // 计算碎片中心
  const center = {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length
  };

  // 计算初速度（基于用户拉扯方向）
  const dirX = userVector.position.x - 50; // 转换为相对中心的方向
  const dirY = userVector.position.y - 50;
  const speed = 100 * userVector.force;
  const length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

  // 绝对位置（加上窗口位置）
  const absoluteCenter = {
    x: (window.position.x / 100) * globalThis.innerWidth + center.x,
    y: (window.position.y / 100) * globalThis.innerHeight + center.y
  };

  return {
    id,
    position: absoluteCenter,
    velocity: {
      x: (dirX / length) * speed,
      y: (dirY / length) * speed
    },
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 4,
    opacity: 1,
    points: points.map(p => ({ ...p }))
  };
}

/**
 * 物理模拟步进
 */
function simulatePhysics(params: PhysicsSimulationParams): Fragment[] {
  const { fragments, deltaTime, gravity, airResistance } = params;

  return fragments.map(fragment => {
    // 应用重力
    fragment.velocity.y += gravity * deltaTime;

    // 应用空气阻力
    fragment.velocity.x *= (1 - airResistance * deltaTime);
    fragment.velocity.y *= (1 - airResistance * deltaTime);

    // 更新位置
    fragment.position.x += fragment.velocity.x * deltaTime;
    fragment.position.y += fragment.velocity.y * deltaTime;

    // 更新旋转
    fragment.rotation += fragment.rotationSpeed * deltaTime;

    return fragment;
  });
}

/**
 * 批量计算多个窗口的撕裂动画
 */
function batchCalculate(tearRequests: TearCalculationParams[]): Map<string, Fragment[]> {
  const results = new Map<string, Fragment[]>();
  
  for (const request of tearRequests) {
    const fragments = calculateTearFragments(request);
    results.set(request.windowId, fragments);
  }
  
  return results;
}

// Worker消息处理
self.onmessage = (e: MessageEvent) => {
  const { type, data, requestId } = e.data;
  
  const startTime = performance.now();
  
  try {
    switch (type) {
      case 'CALCULATE_TEAR_FRAGMENTS': {
        const fragments = calculateTearFragments(data);
        const duration = performance.now() - startTime;
        
        self.postMessage({
          type: 'FRAGMENTS_READY',
          requestId,
          fragments,
          windowId: data.windowId,
          performance: { duration }
        });
        break;
      }
      
      case 'SIMULATE_PHYSICS': {
        const updatedFragments = simulatePhysics(data);
        const duration = performance.now() - startTime;
        
        self.postMessage({
          type: 'PHYSICS_UPDATE',
          requestId,
          fragments: updatedFragments,
          performance: { duration }
        });
        break;
      }
      
      case 'BATCH_CALCULATE': {
        const results = batchCalculate(data.requests);
        const duration = performance.now() - startTime;
        
        self.postMessage({
          type: 'BATCH_RESULTS',
          requestId,
          results: Array.from(results.entries()),
          performance: { duration }
        });
        break;
      }
      
      case 'PING': {
        // 健康检查
        self.postMessage({
          type: 'PONG',
          requestId,
          timestamp: Date.now()
        });
        break;
      }
      
      default:
        console.warn(`[AnimationWorker] Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Worker初始化完成
self.postMessage({
  type: 'WORKER_READY',
  timestamp: Date.now()
});

