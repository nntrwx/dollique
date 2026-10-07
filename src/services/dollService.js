const DollPartModel = require('../models/DollPartModel');
const UserModel = require('../models/UserModel');

const DEFAULT_LAYERS = { base: 10, hair: 20, shoes: 20, outfit: 30, accessory: 50 };
const CATEGORIES = Object.keys(DEFAULT_LAYERS);

const SLOTS = { base: 'base', hair: 'hair', outfit: 'outfit', shoes: 'shoes' };
const MAX_ACCESSORIES = 3;

const isId = (value) => Number.isInteger(value) && value > 0;

class DollService {
  static parseStored(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  static partIds(config) {
    if (!config || typeof config !== 'object') return [];
    const ids = Object.keys(SLOTS).map(slot => config[slot]);
    if (Array.isArray(config.accessories)) ids.push(...config.accessories);
    return ids.filter(isId);
  }

  static async validateConfig(input, currentConfig = null) {
    let config = input;
    if (typeof config === 'string') {
      if (config.trim() === '' || config.trim() === 'null') return { config: null };
      try {
        config = JSON.parse(config);
      } catch (e) {
        return { error: 'Invalid JSON format for doll_config.' };
      }
    }
    if (config === null) return { config: null };
    if (typeof config !== 'object' || Array.isArray(config)) {
      return { error: 'doll_config must be an object like {"base": 1, "outfit": 2}.' };
    }

    const allowedKeys = [...Object.keys(SLOTS), 'accessories'];
    const unknown = Object.keys(config).filter(key => !allowedKeys.includes(key));
    if (unknown.length) {
      return { error: `Unknown doll_config field(s): ${unknown.join(', ')}. Allowed: ${allowedKeys.join(', ')}.` };
    }

    const normalized = { base: null, hair: null, outfit: null, shoes: null, accessories: [] };
    for (const slot of Object.keys(SLOTS)) {
      const value = config[slot];
      if (value === undefined || value === null) continue;
      if (!isId(value)) return { error: `doll_config.${slot} must be a part ID (positive integer) or null.` };
      normalized[slot] = value;
    }
    if (!normalized.base) return { error: 'doll_config.base is required: every doll needs a body.' };

    if (config.accessories !== undefined && config.accessories !== null) {
      if (!Array.isArray(config.accessories) || !config.accessories.every(isId)) {
        return { error: 'doll_config.accessories must be an array of part IDs.' };
      }
      if (new Set(config.accessories).size !== config.accessories.length) {
        return { error: 'doll_config.accessories contains the same part twice.' };
      }
      if (config.accessories.length > MAX_ACCESSORIES) {
        return { error: `A doll can wear at most ${MAX_ACCESSORIES} accessories.` };
      }
      normalized.accessories = config.accessories;
    }

    const ids = this.partIds(normalized);
    const parts = new Map((await DollPartModel.findByIds(ids)).map(p => [p.id, p]));
    const alreadyWorn = new Set(this.partIds(this.parseStored(currentConfig)));

    const checks = Object.entries(SLOTS)
      .filter(([slot]) => normalized[slot])
      .map(([slot, category]) => ({ field: slot, id: normalized[slot], category }));
    normalized.accessories.forEach(id => checks.push({ field: 'accessories', id, category: 'accessory' }));

    for (const { field, id, category } of checks) {
      const part = parts.get(id);
      if (!part) return { error: `doll_config.${field}: doll part #${id} does not exist.` };
      if (part.category !== category) {
        return { error: `doll_config.${field}: part #${id} is a "${part.category}", expected "${category}".` };
      }
      if (!part.is_active && !alreadyWorn.has(id)) {
        return { error: `doll_config.${field}: part #${id} is no longer available.` };
      }
    }

    return { config: normalized };
  }

  static async buildLayers(rawConfig) {
    const config = this.parseStored(rawConfig);
    const parts = await DollPartModel.findByIds(this.partIds(config));

    return parts
      .sort((a, b) => a.layer - b.layer || a.id - b.id)
      .map(part => ({
        part_id: part.id,
        category: part.category,
        name: part.name,
        image_url: part.image_url,
      }));
  }

  static async usageCounts() {
    const counts = new Map();
    for (const row of await UserModel.findDollConfigs()) {
      for (const id of new Set(this.partIds(this.parseStored(row.doll_config)))) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
    return counts;
  }
}

DollService.DEFAULT_LAYERS = DEFAULT_LAYERS;
DollService.CATEGORIES = CATEGORIES;
DollService.MAX_ACCESSORIES = MAX_ACCESSORIES;

module.exports = DollService;
