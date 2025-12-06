/**
 * 碎片顶点着色器
 * 用于 3D 碎片的顶点变换
 */

export default `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_mvpMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_normalMatrix;

varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_worldPosition;

void main() {
  // 计算世界坐标位置
  vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
  v_worldPosition = worldPos.xyz;
  
  // 变换法线到世界空间
  v_normal = mat3(u_normalMatrix) * a_normal;
  
  // 传递纹理坐标
  v_texCoord = a_texCoord;
  
  // 最终裁剪空间位置
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}
`;

