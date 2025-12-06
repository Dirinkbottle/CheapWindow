/**
 * 3D矩阵运算工具
 * 用于WebGL 3D变换：模型、视图、投影矩阵
 */

export type Matrix4 = Float32Array; // 4x4矩阵
export type Vector3 = [number, number, number];
export type Vector4 = [number, number, number, number];

/**
 * 创建单位矩阵
 */
export function identity(): Matrix4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

/**
 * 创建透视投影矩阵
 */
export function perspective(
  fov: number, // 视场角（弧度）
  aspect: number, // 宽高比
  near: number, // 近裁剪面
  far: number // 远裁剪面
): Matrix4 {
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1.0 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ]);
}

/**
 * 创建正交投影矩阵
 */
export function orthographic(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number
): Matrix4 {
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (near - far);

  return new Float32Array([
    -2 * lr, 0, 0, 0,
    0, -2 * bt, 0, 0,
    0, 0, 2 * nf, 0,
    (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
  ]);
}

/**
 * 创建平移矩阵
 */
export function translation(x: number, y: number, z: number): Matrix4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
  ]);
}

/**
 * 创建缩放矩阵
 */
export function scaling(x: number, y: number, z: number): Matrix4 {
  return new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1
  ]);
}

/**
 * 创建X轴旋转矩阵
 */
export function rotationX(angleInRadians: number): Matrix4 {
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);

  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ]);
}

/**
 * 创建Y轴旋转矩阵
 */
export function rotationY(angleInRadians: number): Matrix4 {
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);

  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ]);
}

/**
 * 创建Z轴旋转矩阵
 */
export function rotationZ(angleInRadians: number): Matrix4 {
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);

  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
}

/**
 * 矩阵乘法
 */
export function multiply(a: Matrix4, b: Matrix4): Matrix4 {
  const result = new Float32Array(16);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      result[row * 4 + col] =
        a[row * 4 + 0] * b[0 * 4 + col] +
        a[row * 4 + 1] * b[1 * 4 + col] +
        a[row * 4 + 2] * b[2 * 4 + col] +
        a[row * 4 + 3] * b[3 * 4 + col];
    }
  }

  return result;
}

/**
 * 连续乘多个矩阵
 */
export function multiplyMany(...matrices: Matrix4[]): Matrix4 {
  if (matrices.length === 0) return identity();
  if (matrices.length === 1) return matrices[0];

  let result = matrices[0];
  for (let i = 1; i < matrices.length; i++) {
    result = multiply(result, matrices[i]);
  }

  return result;
}

/**
 * 创建视图矩阵（lookAt）
 */
export function lookAt(
  eye: Vector3, // 相机位置
  target: Vector3, // 目标位置
  up: Vector3 // 上方向
): Matrix4 {
  const zAxis = normalize(subtractVectors(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = normalize(cross(zAxis, xAxis));

  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye),
    -dot(yAxis, eye),
    -dot(zAxis, eye),
    1
  ]);
}

/**
 * 矩阵求逆
 */
export function inverse(m: Matrix4): Matrix4 | null {
  const m00 = m[0 * 4 + 0];
  const m01 = m[0 * 4 + 1];
  const m02 = m[0 * 4 + 2];
  const m03 = m[0 * 4 + 3];
  const m10 = m[1 * 4 + 0];
  const m11 = m[1 * 4 + 1];
  const m12 = m[1 * 4 + 2];
  const m13 = m[1 * 4 + 3];
  const m20 = m[2 * 4 + 0];
  const m21 = m[2 * 4 + 1];
  const m22 = m[2 * 4 + 2];
  const m23 = m[2 * 4 + 3];
  const m30 = m[3 * 4 + 0];
  const m31 = m[3 * 4 + 1];
  const m32 = m[3 * 4 + 2];
  const m33 = m[3 * 4 + 3];

  const tmp0 = m22 * m33;
  const tmp1 = m32 * m23;
  const tmp2 = m12 * m33;
  const tmp3 = m32 * m13;
  const tmp4 = m12 * m23;
  const tmp5 = m22 * m13;
  const tmp6 = m02 * m33;
  const tmp7 = m32 * m03;
  const tmp8 = m02 * m23;
  const tmp9 = m22 * m03;
  const tmp10 = m02 * m13;
  const tmp11 = m12 * m03;
  const tmp12 = m20 * m31;
  const tmp13 = m30 * m21;
  const tmp14 = m10 * m31;
  const tmp15 = m30 * m11;
  const tmp16 = m10 * m21;
  const tmp17 = m20 * m11;
  const tmp18 = m00 * m31;
  const tmp19 = m30 * m01;
  const tmp20 = m00 * m21;
  const tmp21 = m20 * m01;
  const tmp22 = m00 * m11;
  const tmp23 = m10 * m01;

  const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
    (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
  const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
    (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
  const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
    (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
  const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
    (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);

  const d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

  if (!isFinite(d)) return null;

  return new Float32Array([
    d * t0,
    d * t1,
    d * t2,
    d * t3,
    d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
      (tmp0 * m10 + tmp3 * m20 + tmp4 * m30)),
    d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
      (tmp1 * m00 + tmp6 * m20 + tmp9 * m30)),
    d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
      (tmp2 * m00 + tmp7 * m10 + tmp10 * m30)),
    d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
      (tmp5 * m00 + tmp8 * m10 + tmp11 * m20)),
    d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
      (tmp13 * m13 + tmp14 * m23 + tmp17 * m33)),
    d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
      (tmp12 * m03 + tmp19 * m23 + tmp20 * m33)),
    d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
      (tmp15 * m03 + tmp18 * m13 + tmp23 * m33)),
    d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
      (tmp16 * m03 + tmp21 * m13 + tmp22 * m23)),
    d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
      (tmp16 * m32 + tmp12 * m12 + tmp15 * m22)),
    d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
      (tmp18 * m22 + tmp21 * m32 + tmp13 * m02)),
    d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
      (tmp22 * m32 + tmp14 * m02 + tmp19 * m12)),
    d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
      (tmp20 * m12 + tmp23 * m22 + tmp17 * m02))
  ]);
}

/**
 * 向量减法
 */
function subtractVectors(a: Vector3, b: Vector3): Vector3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * 向量归一化
 */
function normalize(v: Vector3): Vector3 {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (length > 0.00001) {
    return [v[0] / length, v[1] / length, v[2] / length];
  }
  return [0, 0, 0];
}

/**
 * 向量叉积
 */
function cross(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

/**
 * 向量点积
 */
function dot(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * 创建碎片的模型矩阵（组合变换）
 */
export function createFragmentModelMatrix(
  position: Vector3,
  rotation: Vector3, // [rotX, rotY, rotZ] 弧度
  scale: Vector3
): Matrix4 {
  return multiplyMany(
    translation(position[0], position[1], position[2]),
    rotationX(rotation[0]),
    rotationY(rotation[1]),
    rotationZ(rotation[2]),
    scaling(scale[0], scale[1], scale[2])
  );
}

/**
 * 将角度转为弧度
 */
export function degToRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * 将弧度转为角度
 */
export function radToDeg(radians: number): number {
  return radians * 180 / Math.PI;
}

