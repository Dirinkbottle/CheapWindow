/**
 * 粒子顶点着色器
 * 使用 Point Sprite 渲染粒子
 */

export default `
attribute vec3 a_position;
attribute float a_size;
attribute vec4 a_color;

uniform mat4 u_mvpMatrix;
uniform float u_pointSize;

varying vec4 v_color;
varying float v_size;

void main() {
  v_color = a_color;
  v_size = a_size;
  
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
  gl_PointSize = a_size * u_pointSize;
}
`;

