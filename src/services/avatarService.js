const AvatarPartModel = require('../models/AvatarPartModel');
const UserModel = require('../models/UserModel');

// Default draw order of each category (bigger = drawn on top). Admins can override it per part.
const DEFAULT_LAYERS = { base: 10, shoes: 20, outfit: 30, hair: 40, accessory: 50 };
const CATEGORIES = Object.keys(DEFAULT_LAYERS);

// Single-choice slots of avatar_config and the catalog category each one takes
const SLOTS = { base: 'base', hair: 'hair', outfit: 'outfit', shoes: 'shoes' };
const MAX_ACCESSORIES = 3;

const isId = (value) => Number.isInteger(value) && value > 0;

class AvatarService {
  // MySQL returns JSON columns parsed, MariaDB returns them as text
  static parseStored(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // All part IDs a config points to
  static partIds(config) {
    if (!config || typeof config !== 'object') return [];
    const ids = Object.keys(SLOTS).map(slot => config[slot]);
    if (Array.isArray(config.accessories)) ids.push(...config.accessories);
    return ids.filter(isId);
  }

  // Checks a new avatar_config and returns it in the canonical shape:
  // { base, hair, outfit, shoes, accessories: [] }. null means "remove the doll".
  // Parts the user already wears may stay even if an admin has retired them since.
  static async validateConfig(input, currentConfig = null) {
    let config = input;
    if (typeof config === 'string') {
      if (config.trim() === '' || config.trim() === 'null') return { config: null };
      try {
        config = JSON.parse(config);
      } catch (e) {
        return { error: 'Invalid JSON format for avatar_config.' };
      }
    }
    if (config === null) return { config: null };
    if (typeof config !== 'object' || Array.isArray(config)) {
      return { error: 'avatar_config must be an object like {"base": 1, "outfit": 2}.' };
    }

    const allowedKeys = [...Object.keys(SLOTS), 'accessories'];
    const unknown = Object.keys(config).filter(key => !allowedKeys.includes(key));
    if (unknown.length) {
      return { error: `Unknown avatar_config field(s): ${unknown.join(', ')}. Allowed: ${allowedKeys.join(', ')}.` };
    }

    const normalized = { base: null, hair: null, outfit: null, shoes: null, accessories: [] };
    for (const slot of Object.keys(SLOTS)) {
      const value = config[slot];
      if (value === undefined || value === null) continue;
      if (!isId(value)) return { error: `avatar_config.${slot} must be a part ID (positive integer) or null.` };
      normalized[slot] = value;
    }
    if (!normalized.base) return { error: 'avatar_config.base is required: every doll needs a body.' };

    if (config.accessories !== undefined && config.accessories !== null) {
      if (!Array.isArray(config.accessories) || !config.accessories.every(isId)) {
        return { error: 'avatar_config.accessories must be an array of part IDs.' };
      }
      if (new Set(config.accessories).size !== config.accessories.length) {
        return { error: 'avatar_config.accessories contains the same part twice.' };
      }
      if (config.accessories.length > MAX_ACCESSORIES) {
        return { error: `A doll can wear at most ${MAX_ACCESSORIES} accessories.` };
      }
      normalized.accessories = config.accessories;
    }

    const ids = this.partIds(normalized);
    const parts = new Map((await AvatarPartModel.findByIds(ids)).map(p => [p.id, p]));
    const alreadyWorn = new Set(this.partIds(this.parseStored(currentConfig)));

    const checks = Object.entries(SLOTS)
      .filter(([slot]) => normalized[slot])
      .map(([slot, category]) => ({ field: slot, id: normalized[slot], category }));
    normalized.accessories.forEach(id => checks.push({ field: 'accessories', id, category: 'accessory' }));

    for (const { field, id, category } of checks) {
      const part = parts.get(id);
      if (!part) return { error: `avatar_config.${field}: avatar part #${id} does not exist.` };
      if (part.category !== category) {
        return { error: `avatar_config.${field}: part #${id} is a "${part.category}", expected "${category}".` };
      }
      if (!part.is_active && !alreadyWorn.has(id)) {
        return { error: `avatar_config.${field}: part #${id} is no longer available.` };
      }
    }

    return { config: normalized };
  }

  // Ordered list of images to stack on top of each other (first = bottom).
  // Back images (long hair behind the body, wings) all go under the fronts.
  static async buildLayers(rawConfig) {
    const config = this.parseStored(rawConfig);
    const parts = await AvatarPartModel.findByIds(this.partIds(config));
    const sorted = parts.sort((a, b) => a.layer - b.layer || a.id - b.id);

    const toLayer = (part, side, imageUrl) => ({
      part_id: part.id,
      category: part.category,
      name: part.name,
      side,
      image_url: imageUrl,
    });

    return [
      ...sorted.filter(p => p.back_image_url).map(p => toLayer(p, 'back', p.back_image_url)),
      ...sorted.map(p => toLayer(p, 'front', p.image_url)),
    ];
  }

  // How many users wear each part: Map(partId -> count)
  static async usageCounts() {
    const counts = new Map();
    for (const row of await UserModel.findAvatarConfigs()) {
      for (const id of new Set(this.partIds(this.parseStored(row.avatar_config)))) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  }
}

AvatarService.DEFAULT_LAYERS = DEFAULT_LAYERS;
AvatarService.CATEGORIES = CATEGORIES;
AvatarService.MAX_ACCESSORIES = MAX_ACCESSORIES;

module.exports = AvatarService;
