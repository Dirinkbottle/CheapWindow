/**
 * 坐标系转换工具
 * 服务器使用百分比坐标系（0-100%），客户端需要转换为像素
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * 百分比转像素
 */
export const percentToPixel = (percent: number, screenSize: number): number => {
  return (percent / 100) * screenSize;
};

/**
 * 像素转百分比
 */
export const pixelToPercent = (pixel: number, screenSize: number): number => {
  return (pixel / screenSize) * 100;
};

/**
 * 百分比坐标转像素坐标
 */
export const percentPointToPixel = (
  percentPoint: Point,
  screenWidth: number,
  screenHeight: number
): Point => {
  return {
    x: percentToPixel(percentPoint.x, screenWidth),
    y: percentToPixel(percentPoint.y, screenHeight)
  };
};

/**
 * 像素坐标转百分比坐标
 */
export const pixelPointToPercent = (
  pixelPoint: Point,
  screenWidth: number,
  screenHeight: number
): Point => {
  return {
    x: pixelToPercent(pixelPoint.x, screenWidth),
    y: pixelToPercent(pixelPoint.y, screenHeight)
  };
};

/**
 * 计算速度（用于抛投）
 * @param startPos 起始位置（像素）
 * @param endPos 结束位置（像素）
 * @param deltaTime 时间间隔（秒）
 */
export const calculateVelocity = (
  startPos: Point,
  endPos: Point,
  deltaTime: number
): Point => {
  if (deltaTime === 0) return { x: 0, y: 0 };
  
  return {
    x: (endPos.x - startPos.x) / deltaTime,
    y: (endPos.y - startPos.y) / deltaTime
  };
};

/**
 * 计算百分比速度
 */
export const calculatePercentVelocity = (
  startPos: Point,
  endPos: Point,
  deltaTime: number,
  screenWidth: number,
  screenHeight: number
): Point => {
  if (deltaTime === 0) return { x: 0, y: 0 };
  
  const pixelVelocity = calculateVelocity(startPos, endPos, deltaTime);
  
  return {
    x: pixelToPercent(pixelVelocity.x, screenWidth),
    y: pixelToPercent(pixelVelocity.y, screenHeight)
  };
};

/**
 * 限制值在范围内
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

