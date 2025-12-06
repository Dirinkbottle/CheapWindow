/**
 * 碎片片段着色器
 * Phong 光照模型 + Fresnel 边缘光
 */

export default `
precision mediump float;

varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_worldPosition;

uniform sampler2D u_texture;
uniform vec3 u_lightDir;
uniform vec3 u_viewPos;
uniform float u_ambientLight;
uniform float u_directionalLight;
uniform float u_edgeLightIntensity;
uniform float u_opacity;
uniform vec3 u_lightColor;

void main() {
  // 获取纹理颜色
  vec4 texColor = texture2D(u_texture, v_texCoord);
  
  // 归一化法线
  vec3 normal = normalize(v_normal);
  
  // 环境光
  vec3 ambient = vec3(u_ambientLight);
  
  // 漫反射光（Lambertian）
  float diff = max(dot(normal, u_lightDir), 0.0);
  vec3 diffuse = diff * u_directionalLight * u_lightColor;
  
  // 镜面反射（简化的 Phong）
  vec3 viewDir = normalize(u_viewPos - v_worldPosition);
  vec3 reflectDir = reflect(-u_lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  vec3 specular = spec * 0.3 * u_lightColor;
  
  // Fresnel 边缘光效果
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);
  vec3 edgeLight = fresnel * u_edgeLightIntensity * vec3(1.0, 1.0, 1.0);
  
  // 组合所有光照
  vec3 lighting = ambient + diffuse + specular + edgeLight;
  
  // 最终颜色
  vec3 finalColor = texColor.rgb * lighting;
  
  gl_FragColor = vec4(finalColor, texColor.a * u_opacity);
}
`;

