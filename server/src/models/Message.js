/**
 * 励志话语数据模型
 */
import { query, queryOne } from '../db.js';

export class Message {
  /**
   * 获取所有励志话语
   */
  static async getAll() {
    const sql = 'SELECT * FROM messages ORDER BY created_at DESC';
    return await query(sql);
  }

  /**
   * 获取随机励志话语
   */
  static async getRandom() {
    const sql = 'SELECT * FROM messages ORDER BY RAND() LIMIT 1';
    return await queryOne(sql);
  }

  /**
   * 根据ID获取话语
   */
  static async getById(id) {
    const sql = 'SELECT * FROM messages WHERE id = ?';
    return await queryOne(sql, [id]);
  }

  /**
   * 创建新话语
   */
  static async create(content, bgColor = '#FFE4E1', textColor = '#333333') {
    const sql = 'INSERT INTO messages (content, bg_color, text_color) VALUES (?, ?, ?)';
    const result = await query(sql, [content, bgColor, textColor]);
    return result.insertId;
  }

  /**
   * 更新话语
   */
  static async update(id, content, bgColor, textColor) {
    const sql = 'UPDATE messages SET content = ?, bg_color = ?, text_color = ? WHERE id = ?';
    await query(sql, [content, bgColor, textColor, id]);
  }

  /**
   * 删除话语
   */
  static async delete(id) {
    const sql = 'DELETE FROM messages WHERE id = ?';
    await query(sql, [id]);
  }

  /**
   * 获取话语总数
   */
  static async count() {
    const sql = 'SELECT COUNT(*) as count FROM messages';
    const result = await queryOne(sql);
    return result.count;
  }
}

/**
 * 系统配置模型
 */
export class Setting {
  /**
   * 获取所有配置
   */
  static async getAll() {
    const sql = 'SELECT * FROM settings';
    const rows = await query(sql);
    // 转换为键值对对象
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  /**
   * 获取单个配置
   */
  static async get(key) {
    const sql = 'SELECT value FROM settings WHERE `key` = ?';
    const result = await queryOne(sql, [key]);
    return result ? result.value : null;
  }

  /**
   * 设置配置值
   */
  static async set(key, value, description = '') {
    const sql = `
      INSERT INTO settings (\`key\`, \`value\`, description) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE \`value\` = ?, description = ?
    `;
    await query(sql, [key, value, description, value, description]);
  }

  /**
   * 批量更新配置
   */
  static async updateMultiple(settings) {
    const promises = Object.entries(settings).map(([key, value]) => 
      this.set(key, String(value))
    );
    await Promise.all(promises);
  }

  /**
   * 获取配置（带类型转换）
   */
  static async getTyped(key, type = 'string') {
    const value = await this.get(key);
    if (value === null) return null;
    
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}

