/**
 * 窗口位置计算工具
 * （注：实际位置计算在服务器端完成，这里保留作为备用）
 */

export interface GridPosition {
  x: number;
  y: number;
}

/**
 * 初始化网格位置（百分比坐标）
 */
export const initGridPositions = (): GridPosition[] => {
  const positions: GridPosition[] = [];
  
  // 使用百分比，每个格子占据一定比例
  const cols = Math.floor(100 / 15); // 约6-7列
  const rows = Math.floor(100 / 10); // 约10行
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col * 15) + 5; // 5-95%范围
      const y = (row * 10) + 5; // 5-95%范围
      positions.push({ x, y });
    }
  }
  
  // 打乱顺序
  return shuffleArray(positions);
};

/**
 * 打乱数组
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * 获取随机位置（百分比）
 */
export const getRandomPosition = (): GridPosition => {
  return {
    x: Math.random() * 90 + 5, // 5-95%
    y: Math.random() * 90 + 5
  };
};

