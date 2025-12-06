/**
 * WebGL 着色器管理器
 * 处理着色器编译、链接和程序管理
 */

export class ShaderManager {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
    this.currentProgram = null;
  }

  /**
   * 创建并编译着色器程序
   */
  createProgram(name, vertexShaderSource, fragmentShaderSource) {
    const gl = this.gl;

    // 编译顶点着色器
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    if (!vertexShader) {
      console.error(`Failed to compile vertex shader for ${name}`);
      return null;
    }

    // 编译片段着色器
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) {
      console.error(`Failed to compile fragment shader for ${name}`);
      gl.deleteShader(vertexShader);
      return null;
    }

    // 链接程序
    const program = this.linkProgram(vertexShader, fragmentShader);
    if (!program) {
      console.error(`Failed to link program for ${name}`);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    // 获取所有 attributes 和 uniforms
    const attributes = this.getAttributes(program);
    const uniforms = this.getUniforms(program);

    const programInfo = {
      program,
      vertexShader,
      fragmentShader,
      attributes,
      uniforms
    };

    this.programs.set(name, programInfo);
    console.log(`✓ Shader program created: ${name}`);

    return programInfo;
  }

  /**
   * 编译着色器
   */
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', info);
      console.error('Source:', source);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * 链接着色器程序
   */
  linkProgram(vertexShader, fragmentShader) {
    const gl = this.gl;
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      console.error('Program linking error:', info);
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  /**
   * 获取所有 attributes
   */
  getAttributes(program) {
    const gl = this.gl;
    const attributes = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (let i = 0; i < count; i++) {
      const info = gl.getActiveAttrib(program, i);
      const location = gl.getAttribLocation(program, info.name);
      attributes[info.name] = location;
    }

    return attributes;
  }

  /**
   * 获取所有 uniforms
   */
  getUniforms(program) {
    const gl = this.gl;
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, info.name);
      uniforms[info.name] = location;
    }

    return uniforms;
  }

  /**
   * 使用着色器程序
   */
  useProgram(name) {
    const programInfo = this.programs.get(name);
    if (!programInfo) {
      console.error(`Program not found: ${name}`);
      return null;
    }

    if (this.currentProgram !== programInfo.program) {
      this.gl.useProgram(programInfo.program);
      this.currentProgram = programInfo.program;
    }

    return programInfo;
  }

  /**
   * 设置 uniform 值
   */
  setUniform(programInfo, name, value) {
    const gl = this.gl;
    const location = programInfo.uniforms[name];

    if (location === undefined || location === null) {
      return;
    }

    if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (value.length === 2) {
      gl.uniform2fv(location, value);
    } else if (value.length === 3) {
      gl.uniform3fv(location, value);
    } else if (value.length === 4) {
      gl.uniform4fv(location, value);
    } else if (value.length === 16) {
      gl.uniformMatrix4fv(location, false, value);
    }
  }

  /**
   * 批量设置 uniforms
   */
  setUniforms(programInfo, uniforms) {
    for (const [name, value] of Object.entries(uniforms)) {
      this.setUniform(programInfo, name, value);
    }
  }

  /**
   * 获取程序
   */
  getProgram(name) {
    return this.programs.get(name);
  }

  /**
   * 删除程序
   */
  deleteProgram(name) {
    const programInfo = this.programs.get(name);
    if (programInfo) {
      const gl = this.gl;
      gl.deleteProgram(programInfo.program);
      gl.deleteShader(programInfo.vertexShader);
      gl.deleteShader(programInfo.fragmentShader);
      this.programs.delete(name);
    }
  }

  /**
   * 清理所有程序
   */
  dispose() {
    for (const name of this.programs.keys()) {
      this.deleteProgram(name);
    }
    this.currentProgram = null;
  }
}

