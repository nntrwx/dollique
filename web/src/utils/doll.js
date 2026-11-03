export const SLOTS = ['base', 'hair', 'outfit', 'shoes'];
export const MAX_ACCESSORIES = 3;

export function partsOf(parts, category, config = null) {
  const worn = config ? [...SLOTS.map((slot) => config[slot]), ...(config.accessories || [])] : [];
  return parts.filter((part) => part.category === category && (part.is_active !== false || worn.includes(part.id)));
}

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

export function describeDoll(config, parts) {
  return layersOf(config, parts)
    .filter((part) => part.category !== 'base')
    .map((part) => part.name.toLowerCase())
    .join(', ');
}
