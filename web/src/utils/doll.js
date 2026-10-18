// Helpers for doll_config: {"base": id, "hair": id|null, "outfit": id|null, "shoes": id|null, "accessories": [ids]}

export const SLOTS = ['base', 'hair', 'outfit', 'shoes'];
export const MAX_ACCESSORIES = 3;

// Parts a user can pick: active ones, plus the ones this doll already wears
// (a retired part stays on the dolls that have it).
export function partsOf(parts, category, config = null) {
  const worn = config ? [...SLOTS.map((slot) => config[slot]), ...(config.accessories || [])] : [];
  return parts.filter((part) => part.category === category && (part.is_active !== false || worn.includes(part.id)));
}

// Layers to draw, bottom to top. With onlyAccessory the doll wears just that accessory
// (used for the tiles of the accessories shelf).
export function layersOf(config, parts, onlyAccessory) {
  if (!config) return [];
  const accessories = onlyAccessory === undefined ? config.accessories || [] : [onlyAccessory].filter(Boolean);
  const ids = [...SLOTS.map((slot) => config[slot]), ...accessories];
  return parts
    .filter((part) => ids.includes(part.id))
    .map((part) => ({ ...part, highlight: part.id === onlyAccessory }))
    .sort((a, b) => a.layer - b.layer);
}

function pickRandom(list) {
  return list.length ? list[Math.floor(Math.random() * list.length)].id : null;
}

export function randomConfig(parts) {
  const config = { accessories: [] };
  SLOTS.forEach((slot) => {
    config[slot] = pickRandom(partsOf(parts, slot));
  });
  config.accessories = partsOf(parts, 'accessory')
    .filter(() => Math.random() < 0.3)
    .slice(0, MAX_ACCESSORIES)
    .map((part) => part.id);
  return config;
}

// Short words for the doll card: "pink waves, lace nightgown, nurse cap".
export function describeDoll(config, parts) {
  return layersOf(config, parts)
    .filter((part) => part.category !== 'base')
    .map((part) => part.name.toLowerCase())
    .join(', ');
}
