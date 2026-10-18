import { MAX_ACCESSORIES, layersOf, partsOf } from '../utils/doll';
import DollFigure from './DollFigure';
import Pixel from './Pixel';
import './DressUp.css';

// Arrows sit at the height of what they change.
const ROWS = [
  { slot: 'hair', label: 'hair' },
  { slot: 'outfit', label: 'outfit' },
  { slot: 'shoes', label: 'shoes' },
];

function shortName(name) {
  return name.replace(/ hair clip$/i, '').replace(/ ribbon bow$/i, ' bow').replace(/^Angel wing clips$/i, 'Wings');
}

function Arrow({ direction, label, onClick }) {
  return (
    <button type="button" className="arr" aria-label={label} onClick={onClick}>
      <Pixel name={direction} color="#211c1f" size={12} />
    </button>
  );
}

// Dress-up doll: arrows change hair, outfit and shoes right where they are,
// arrows under the doll change the body, the shelf below holds up to 3 accessories.
// config is a doll_config; onChange gets the next one.
function DressUp({ parts, config, onChange }) {
  // Hair, outfit and shoes can be "none"; a body is required.
  const step = (slot, direction) => {
    const ids = partsOf(parts, slot, config).map((part) => part.id);
    const options = slot === 'base' ? ids : [...ids, null];
    const index = options.indexOf(config[slot] ?? null);
    const next = options[(index + direction + options.length) % options.length];
    onChange({ ...config, [slot]: next });
  };

  const toggleAccessory = (id) => {
    const current = config.accessories || [];
    let next;
    if (id === null) next = [];
    else if (current.includes(id)) next = current.filter((item) => item !== id);
    else if (current.length < MAX_ACCESSORIES) next = [...current, id];
    else return;
    onChange({ ...config, accessories: next });
  };

  const bodies = partsOf(parts, 'base', config);
  const bodyIndex = bodies.findIndex((part) => part.id === config.base);
  const accessories = partsOf(parts, 'accessory', config);
  const worn = config.accessories || [];

  return (
    <div className="dressup">
      <div className="stage">
        <img className="stage__wings" src="/decor/dot-wings.svg" alt="" />
        <DollFigure layers={layersOf(config, parts)} label="Your doll" />
        {ROWS.map(({ slot, label }) => {
          const list = partsOf(parts, slot, config);
          const index = list.findIndex((part) => part.id === config[slot]);
          return (
            <div key={slot} className={`stage__row stage__row--${slot}`}>
              <Arrow direction="left" label={`Previous ${label}`} onClick={() => step(slot, -1)} />
              <span className="stage__tip stage__tip--l">{label}</span>
              <span className="stage__tip stage__tip--r" title={index < 0 ? '' : list[index].name}>
                {index < 0 ? 'none' : `${index + 1} / ${list.length}`}
              </span>
              <Arrow direction="right" label={`Next ${label}`} onClick={() => step(slot, 1)} />
            </div>
          );
        })}
      </div>

      <div className="bodysel">
        <Arrow direction="left" label="Previous body" onClick={() => step('base', -1)} />
        <span className="bodysel__name">
          <small>{`body · ${bodyIndex + 1} / ${bodies.length}`}</small>
          {bodies[bodyIndex]?.name || 'Pick a body'}
        </span>
        <Arrow direction="right" label="Next body" onClick={() => step('base', 1)} />
      </div>

      <div className="accs">
        <div className="accs__top">
          <span className="mono">accessories</span>
          <span className="mono">{`${worn.length} / ${MAX_ACCESSORIES}`}</span>
        </div>
        <div className="accs__list">
          {[{ id: null, name: 'None' }, ...accessories].map((part) => {
            const on = part.id === null ? worn.length === 0 : worn.includes(part.id);
            return (
              <button
                key={part.id ?? 'none'}
                type="button"
                className={`acc${on ? ' on' : ''}`}
                title={part.name}
                aria-pressed={on}
                onClick={() => toggleAccessory(part.id)}
              >
                <DollFigure layers={layersOf(config, parts, part.id)} label={part.name} />
                <span className="acc__name">{shortName(part.name)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DressUp;
