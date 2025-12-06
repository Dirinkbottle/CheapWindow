/**
 * 粒子片段着色器
 * 圆形粒子带柔和边缘
 */

export default `
precision mediump float;

varying vec4 v_color;
varying float v_size;

void main() {
  // 计算到点中心的距离
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  
  // 圆形遮罩，带柔和边缘
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  // 中心更亮
  float brightness = 1.0 - dist * 0.5;
  
  vec3 finalColor = v_color.rgb * brightness;
  float finalAlpha = v_color.a * alpha;
  
  if (finalAlpha < 0.01) {
    discard;
  }
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

