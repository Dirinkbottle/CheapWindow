/**
 * 裂纹顶点着色器
 * 用于 2D 裂纹线条渲染
 */

export default `
attribute vec2 a_position;
attribute float a_width;

uniform mat4 u_projectionMatrix;
uniform vec2 u_resolution;

varying float v_width;

void main() {
  v_width = a_width;
  
  // 转换到裁剪空间
  vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
  clipSpace.y = -clipSpace.y; // 翻转 Y 轴
  
  gl_Position = vec4(clipSpace, 0.0, 1.0);
}
`;

