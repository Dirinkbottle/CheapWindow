/**
 * 裂纹片段着色器
 * 带发光效果
 */

export default `
precision mediump float;

varying float v_width;

uniform vec4 u_color;
uniform float u_glowIntensity;

void main() {
  // 基础裂纹颜色
  vec4 crackColor = u_color;
  
  // 发光效果
  if (u_glowIntensity > 0.0) {
    vec3 glowColor = vec3(0.3, 0.9, 0.5); // 绿色发光
    crackColor.rgb += glowColor * u_glowIntensity;
  }
  
  gl_FragColor = crackColor;
}
`;

