/**
 * 窗口内容渲染到WebGL纹理系统
 * 将2D窗口的背景、文字、边框渲染为高分辨率纹理
 */

import type { WindowData } from '../types';

export interface TextureRenderOptions {
  resolution: '1x' | '2x' | '4x'; // 纹理分辨率倍数
  includeText: boolean; // 是否包含文字
  includeBorder: boolean; // 是否包含边框
  includeShadow: boolean; // 是否包含阴影
}

/**
 * 将窗口内容渲染到Canvas，然后转换为WebGL纹理
 */
export function renderWindowToTexture(
  gl: WebGLRenderingContext,
  window: WindowData,
  options: TextureRenderOptions
): WebGLTexture | null {
  const multiplier = getResolutionMultiplier(options.resolution);
  const width = window.size.width * multiplier;
  const height = window.size.height * multiplier;

  // 创建离屏Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;

  // 设置高质量渲染
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. 渲染阴影（如果启用）
  if (options.includeShadow) {
    renderShadow(ctx, width, height, multiplier);
  }

  // 2. 渲染背景
  renderBackground(ctx, window, width, height);

  // 3. 渲染边框（如果启用）
  if (options.includeBorder) {
    renderBorder(ctx, window, width, height, multiplier);
  }

  // 4. 渲染文字（如果启用）
  if (options.includeText) {
    renderText(ctx, window, width, height, multiplier);
  }

  // 创建WebGL纹理
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // 设置纹理参数
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // 上传Canvas内容到纹理
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    canvas
  );

  return texture;
}

/**
 * 渲染窗口阴影
 */
function renderShadow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  multiplier: number
) {
  const shadowBlur = 15 * multiplier;
  const shadowOffset = 10 * multiplier;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowOffset;
  ctx.shadowOffsetY = shadowOffset;

  // 绘制阴影矩形
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(
    shadowOffset,
    shadowOffset,
    width - shadowOffset * 2,
    height - shadowOffset * 2
  );

  ctx.restore();
}

/**
 * 渲染窗口背景
 */
function renderBackground(
  ctx: CanvasRenderingContext2D,
  window: WindowData,
  width: number,
  height: number
) {
  // 渐变背景（增加质感）
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const baseColor = window.colors.bg;
  
  // 提取RGB值
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // 创建轻微的渐变效果
  gradient.addColorStop(0, `rgba(${r + 10}, ${g + 10}, ${b + 10}, 1)`);
  gradient.addColorStop(1, `rgba(${r - 10}, ${g - 10}, ${b - 10}, 1)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 添加微妙的纹理
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < width; i += 4) {
    for (let j = 0; j < height; j += 4) {
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(i, j, 2, 2);
      }
    }
  }
  ctx.restore();
}

/**
 * 渲染窗口边框
 */
function renderBorder(
  ctx: CanvasRenderingContext2D,
  window: WindowData,
  width: number,
  height: number,
  multiplier: number
) {
  const borderWidth = 3 * multiplier;

  ctx.strokeStyle = window.colors.text;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    width - borderWidth,
    height - borderWidth
  );

  // 内侧高光
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1 * multiplier;
  ctx.strokeRect(
    borderWidth,
    borderWidth,
    width - borderWidth * 2,
    height - borderWidth * 2
  );
  ctx.restore();
}

/**
 * 渲染窗口文字
 */
function renderText(
  ctx: CanvasRenderingContext2D,
  window: WindowData,
  width: number,
  height: number,
  multiplier: number
) {
  const fontSize = window.fontSize * multiplier;

  ctx.fillStyle = window.colors.text;
  ctx.font = `${fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 文字阴影增强立体感
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 2 * multiplier;
  ctx.shadowOffsetX = 1 * multiplier;
  ctx.shadowOffsetY = 1 * multiplier;

  // 支持多行文字
  const lines = wrapText(ctx, window.message, width * 0.9);
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  const startY = (height - totalHeight) / 2 + lineHeight / 2;

  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      width / 2,
      startY + index * lineHeight
    );
  });

  ctx.restore();
}

/**
 * 文字换行处理
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const words = text.split('');
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * 获取分辨率倍数
 */
function getResolutionMultiplier(resolution: '1x' | '2x' | '4x'): number {
  switch (resolution) {
    case '1x': return 1;
    case '2x': return 2;
    case '4x': return 4;
    default: return 2;
  }
}

/**
 * 为碎片生成纹理坐标
 * 根据碎片在窗口中的位置计算UV坐标
 */
export function generateFragmentUVs(
  fragmentPolygon: Array<{ x: number; y: number }>,
  windowSize: { width: number; height: number }
): Float32Array {
  const uvs: number[] = [];

  fragmentPolygon.forEach(point => {
    // 归一化到0-1范围
    const u = point.x / windowSize.width;
    const v = point.y / windowSize.height;
    uvs.push(u, v);
  });

  return new Float32Array(uvs);
}

/**
 * 清理纹理资源
 */
export function disposeTexture(gl: WebGLRenderingContext, texture: WebGLTexture | null) {
  if (texture) {
    gl.deleteTexture(texture);
  }
}

