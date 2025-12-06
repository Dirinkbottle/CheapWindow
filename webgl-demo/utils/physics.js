/**
 * 物理引擎 (Pure JavaScript)
 * 用于碎片和粒子的物理模拟
 */

/**
 * 更新碎片物理
 */
export function updateFragmentPhysics(fragment, dt, config) {
  const gravity = parseFloat(config.tear_gravity || 200);
  const airResistance = parseFloat(config.tear_air_resistance || 0.02);
  const rotationDamping = parseFloat(config.tear_rotation_damping || 0.05);
  
  // 应用重力
  fragment.velocity.y += gravity * dt;
  
  // 应用空气阻力
  fragment.velocity.x *= (1 - airResistance);
  fragment.velocity.y *= (1 - airResistance);
  fragment.velocity.z *= (1 - airResistance);
  
  // 更新位置
  fragment.position.x += fragment.velocity.x * dt;
  fragment.position.y += fragment.velocity.y * dt;
  fragment.position.z += fragment.velocity.z * dt;
  
  // 更新旋转
  if (config.tear_enable_rotation === '1') {
    fragment.rotation.x += fragment.angularVelocity.x * dt;
    fragment.rotation.y += fragment.angularVelocity.y * dt;
    fragment.rotation.z += fragment.angularVelocity.z * dt;
    
    // 应用旋转阻尼
    fragment.angularVelocity.x *= (1 - rotationDamping);
    fragment.angularVelocity.y *= (1 - rotationDamping);
    fragment.angularVelocity.z *= (1 - rotationDamping);
  }
  
  // 更新缩放
  if (config.tear_enable_scale === '1') {
    // 可以添加缩放动画逻辑
  }
}

/**
 * 更新粒子物理
 */
export function updateParticlePhysics(particle, dt, config) {
  const gravity = parseFloat(config.tear_gravity || 200) * 0.5;
  const lifeMult = parseFloat(config.tear_particle_lifetime_mult || 1);
  
  // 应用重力
  particle.velocity.y += gravity * dt;
  
  // 更新位置
  particle.position.x += particle.velocity.x * dt;
  particle.position.y += particle.velocity.y * dt;
  particle.position.z += particle.velocity.z * dt;
  
  // 更新生命值
  particle.life -= dt / lifeMult;
  
  // 更新不透明度
  particle.opacity = Math.max(0, particle.life / particle.maxLife);
  
  // 更新大小（随生命值缩小）
  particle.currentSize = particle.size * particle.opacity;
}

/**
 * 检测碎片碰撞（简化版）
 */
export function detectFragmentCollisions(fragments) {
  const collisions = [];
  
  for (let i = 0; i < fragments.length; i++) {
    for (let j = i + 1; j < fragments.length; j++) {
      const f1 = fragments[i];
      const f2 = fragments[j];
      
      const dx = f1.position.x - f2.position.x;
      const dy = f1.position.y - f2.position.y;
      const dz = f1.position.z - f2.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      const minDist = (f1.size + f2.size) / 2;
      const minDistSq = minDist * minDist;
      
      if (distSq < minDistSq) {
        collisions.push({ f1, f2, distance: Math.sqrt(distSq) });
      }
    }
  }
  
  return collisions;
}

/**
 * 解决碰撞
 */
export function resolveCollision(f1, f2) {
  const dx = f2.position.x - f1.position.x;
  const dy = f2.position.y - f1.position.y;
  const dz = f2.position.z - f1.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  if (dist === 0) return;
  
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;
  
  // 相对速度
  const dvx = f2.velocity.x - f1.velocity.x;
  const dvy = f2.velocity.y - f1.velocity.y;
  const dvz = f2.velocity.z - f1.velocity.z;
  
  // 沿法线的相对速度
  const relativeVelocity = dvx * nx + dvy * ny + dvz * nz;
  
  // 如果正在分离，不处理
  if (relativeVelocity > 0) return;
  
  // 弹性系数
  const restitution = 0.5;
  
  // 冲量
  const impulse = -(1 + restitution) * relativeVelocity / 2;
  
  // 应用冲量
  f1.velocity.x -= impulse * nx;
  f1.velocity.y -= impulse * ny;
  f1.velocity.z -= impulse * nz;
  
  f2.velocity.x += impulse * nx;
  f2.velocity.y += impulse * ny;
  f2.velocity.z += impulse * nz;
}

/**
 * 计算爆炸力
 */
export function calculateExplosionForce(position, center, explosionForce) {
  const dx = position.x - center.x;
  const dy = position.y - center.y;
  const dz = position.z - center.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  if (dist === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  
  const force = explosionForce / (dist * dist + 1);
  
  return {
    x: (dx / dist) * force,
    y: (dy / dist) * force,
    z: (dz / dist) * force
  };
}

