const pool = require('../../database/db');

const PART_FIELDS = 'id, category, name, image_url, back_image_url, layer, is_active, created_at';

// MySQL BOOLEAN comes back as 0/1
const toPart = (row) => ({ ...row, is_active: Boolean(row.is_active) });

class AvatarPartModel {
  // 1. Catalog list; guests and users only see active parts
  static async findAll({ category, includeInactive = false } = {}) {
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (!includeInactive) conditions.push('is_active = TRUE');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT ${PART_FIELDS} FROM avatar_parts ${where} ORDER BY layer ASC, id ASC`,
      params
    );
    return rows.map(toPart);
  }

  // 2. Find one part by ID
  static async findById(id) {
    const partId = Number(id);
    if (!Number.isInteger(partId)) return null;

    const [rows] = await pool.execute(`SELECT ${PART_FIELDS} FROM avatar_parts WHERE id = ?`, [partId]);
    return rows[0] ? toPart(rows[0]) : null;
  }

  // 3. Find several parts at once (used to validate and render an avatar_config)
  static async findByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const [rows] = await pool.execute(
      `SELECT ${PART_FIELDS} FROM avatar_parts WHERE id IN (${placeholders})`,
      ids
    );
    return rows.map(toPart);
  }

  // 4. Create a part
  static async create({ category, name, imageUrl, backImageUrl = null, layer, isActive = true }) {
    const [result] = await pool.execute(
      `INSERT INTO avatar_parts (category, name, image_url, back_image_url, layer, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category, name, imageUrl, backImageUrl, layer, isActive]
    );
    return this.findById(result.insertId);
  }

  // 5. Update only the provided fields
  static async update(id, data) {
    const columns = {
      category: 'category',
      name: 'name',
      imageUrl: 'image_url',
      backImageUrl: 'back_image_url',
      layer: 'layer',
      isActive: 'is_active',
    };

    const fields = [];
    const values = [];
    for (const [key, column] of Object.entries(columns)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      values.push(Number(id));
      await pool.execute(`UPDATE avatar_parts SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  }

  // 6. Delete a part
  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM avatar_parts WHERE id = ?', [Number(id)]);
    return result.affectedRows > 0;
  }
}

module.exports = AvatarPartModel;
