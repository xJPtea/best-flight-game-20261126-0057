// Skyline Courier — the upgrade shop. Credits earned in flight buy engine,
// hull and fuel tiers. The shop owns the rules (can the pilot afford this
// tier?) and the panel layout the renderer paints between missions.

import { UPGRADES } from './config.js';
import { playBuy, playDenied } from './audio.js';

export function createShop(save) {
  return {
    credits: save.credits,
    levels: { ...save.upgrades },
    selected: 0,
  };
}

// Current tier object for one upgrade line.
export function tierOf(line, level) {
  return UPGRADES.find((u) => u.key === line).tiers[level];
}

// Effective plane stats after upgrades. main.js reads these every frame.
export function effectiveStats(shop) {
  const engine = tierOf('engine', shop.levels.engine);
  const hull = tierOf('hull', shop.levels.hull);
  const tank = tierOf('tank', shop.levels.tank);
  return {
    speedBonus: engine.speedBonus,
    climbBonus: engine.climbBonus,
    hullBonus: hull.hullBonus,
    fuelBonus: tank.fuelBonus,
  };
}

// Try to buy the next tier of a line. Returns a short message for the panel.
export function buyTier(shop, lineKey) {
  const line = UPGRADES.find((u) => u.key === lineKey);
  const level = shop.levels[lineKey];
  if (level >= line.tiers.length - 1) return 'Already maxed out.';
  const next = line.tiers[level + 1];
  if (shop.credits < next.price) {
    playDenied();
    return `Need ${next.price} credits — you have ${shop.credits}.`;
  }
  shop.credits -= next.price;
  shop.levels[lineKey] = level + 1;
  playBuy();
  return `${line.label} upgraded to ${next.name}.`;
}

// The three shop rows, with prices and affordability, for the panel.
export function shopRows(shop) {
  return UPGRADES.map((line, i) => {
    const level = shop.levels[line.key];
    const current = line.tiers[level];
    const next = line.tiers[level + 1] || null;
    return {
      index: i,
      key: line.key,
      label: line.label,
      blurb: line.blurb,
      currentName: current.name,
      nextName: next ? next.name : 'MAX',
      nextPrice: next ? next.price : null,
      affordable: next ? shop.credits >= next.price : false,
      level,
      maxLevel: line.tiers.length - 1,
    };
  });
}
