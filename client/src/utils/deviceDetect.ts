/**
 * 设备检测工具
 * 用于识别移动设备和评估性能
 */

/**
 * 检测是否为移动设备
 */
export function isMobileDevice(): boolean {
  // 检查 User Agent
  const ua = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile'];
  const isMobileUA = mobileKeywords.some(keyword => ua.includes(keyword));
  
  // 检查触摸支持
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 检查屏幕尺寸（移动设备通常较小）
  const isSmallScreen = window.innerWidth <= 768;
  
  return isMobileUA || (hasTouch && isSmallScreen);
}

/**
 * 检测是否为平板设备
 */
export function isTabletDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isTablet = ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'));
  return isTablet;
}

/**
 * 评估设备性能等级
 * @returns 'high' | 'medium' | 'low'
 */
export function getDevicePerformance(): 'high' | 'medium' | 'low' {
  // 检查硬件并发数（CPU 核心数）
  const cores = navigator.hardwareConcurrency || 2;
  
  // 检查设备内存（如果可用）
  const memory = (navigator as any).deviceMemory || 4; // GB
  
  // 检查是否为移动设备
  const mobile = isMobileDevice();
  
  // 性能评分
  let score = 0;
  
  // CPU 核心数评分
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 1;
  
  // 内存评分
  if (memory >= 8) score += 3;
  else if (memory >= 4) score += 2;
  else score += 1;
  
  // 移动设备降低评分
  if (mobile) score -= 2;
  
  // 根据评分返回等级
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * 获取推荐的物理更新频率
 */
export function getRecommendedFPS(): number {
  const performance = getDevicePerformance();
  const mobile = isMobileDevice();
  
  if (mobile) {
    // 移动设备
    if (performance === 'high') return 60;
    if (performance === 'medium') return 30;
    return 20;
  } else {
    // 桌面设备
    if (performance === 'high') return 60;
    if (performance === 'medium') return 45;
    return 30;
  }
}

/**
 * 检测是否支持 GPU 加速
 */
export function supportsGPUAcceleration(): boolean {
  // 检查是否支持 3D transform
  const el = document.createElement('div');
  const transforms = [
    'transform',
    'WebkitTransform',
    'MozTransform',
    'OTransform',
    'msTransform'
  ];
  
  for (const transform of transforms) {
    if (el.style[transform as any] !== undefined) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取设备信息摘要
 */
export function getDeviceInfo() {
  return {
    isMobile: isMobileDevice(),
    isTablet: isTabletDevice(),
    performance: getDevicePerformance(),
    recommendedFPS: getRecommendedFPS(),
    supportsGPU: supportsGPUAcceleration(),
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    },
    hardware: {
      cores: navigator.hardwareConcurrency || 'unknown',
      memory: (navigator as any).deviceMemory || 'unknown'
    },
    userAgent: navigator.userAgent
  };
}

