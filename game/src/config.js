// Skyline Courier — shared tuning numbers and mission definitions.
// Every value the rest of the game reads lives here, so a balance pass
// touches one file and nothing else.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const GAME_TITLE = 'Skyline Courier';
export const GAME_SUBTITLE = 'Rings, Upgrades & the Storm Carrier';

// World units are metres. The plane flies east; x grows as it advances.
// Altitude 0 is sea level, terrain height comes from world.js.
export const PHYSICS = {
  baseSpeed: 62, // m/s at full throttle, stock engine
  minSpeed: 26, // m/s before the plane starts to sink
  climbRate: 34, // m/s of vertical speed at full pitch up
  sinkRate: 16, // m/s the plane loses when slow and level
  turnRate: 26, // degrees per second of heading change
  headingMin: 42, // degrees; heading 90 is due east
  headingMax: 138,
  fuelDrain: 0.55, // fuel units per second at full throttle
  fuelTank: 100,
  hull: 100,
  ringFuelBonus: 6,
  ringCredit: 50,
  deliveryBase: 200,
};

// One mission per sortie. Rings are generated from the mission's seed;
// later missions add wind, tighter altitude bands and the boss.
export const MISSIONS = [
  {
    id: 1,
    name: 'Harbour Run',
    brief: 'Take off from Coral Runway and thread the harbour rings.',
    rings: 4,
    timeLimit: 150,
    band: [120, 900],
    wind: 0,
    seed: 101,
    boss: false,
  },
  {
    id: 2,
    name: 'Island Hop',
    brief: 'Hop the island chain. Stay inside the altitude band.',
    rings: 5,
    timeLimit: 140,
    band: [240, 620],
    wind: 3,
    seed: 202,
    boss: false,
  },
  {
    id: 3,
    name: 'Mountain Pass',
    brief: 'Thread the pass between the twin peaks. Gusts push you around.',
    rings: 6,
    timeLimit: 150,
    band: [300, 700],
    wind: 7,
    seed: 303,
    boss: false,
  },
  {
    id: 4,
    name: 'Storm Front',
    brief: 'Fly the storm line. Heavy rain, hard gusts, low ceiling.',
    rings: 6,
    timeLimit: 150,
    band: [180, 520],
    wind: 12,
    seed: 404,
    boss: false,
  },
  {
    id: 5,
    name: 'Storm Carrier',
    brief: 'Reach the carrier, then break its core. Bring everything you own.',
    rings: 3,
    timeLimit: 220,
    band: [200, 800],
    wind: 6,
    seed: 505,
    boss: true,
  },
];

// The upgrade shop sells three lines. Each line has three tiers; buying a
// tier replaces the one before it. Prices are in credits.
export const UPGRADES = [
  {
    key: 'engine',
    label: 'Engine',
    blurb: 'More thrust, higher top speed, faster climbs.',
    tiers: [
      { name: 'Mk I Stock', price: 0, speedBonus: 0, climbBonus: 0 },
      { name: 'Mk II Turbo', price: 300, speedBonus: 18, climbBonus: 8 },
      { name: 'Mk III Stormjet', price: 650, speedBonus: 34, climbBonus: 16 },
    ],
  },
  {
    key: 'hull',
    label: 'Hull Plating',
    blurb: 'Thicker skin. Survives flak and hard landings.',
    tiers: [
      { name: 'Light Frame', price: 0, hullBonus: 0 },
      { name: 'Alloy Plating', price: 250, hullBonus: 50 },
      { name: 'Storm Armour', price: 550, hullBonus: 110 },
    ],
  },
  {
    key: 'tank',
    label: 'Fuel Tank',
    blurb: 'Bigger tank, longer sorties, fewer worries.',
    tiers: [
      { name: 'Standard Tank', price: 0, fuelBonus: 0 },
      { name: 'Drop Tanks', price: 200, fuelBonus: 45 },
      { name: 'Long-Range Cells', price: 450, fuelBonus: 100 },
    ],
  },
];

// Colours for one consistent look: dusk sky, teal sea, warm sand, green
// hills, and a courier plane in signal orange.
export const PALETTE = {
  skyTop: '#1d3a5f',
  skyMid: '#4d7ea8',
  skyLow: '#e8a56b',
  sun: '#ffd98a',
  sea: '#1f6f8b',
  seaDeep: '#155a75',
  sand: '#e0c184',
  grass: '#4d8a4a',
  hill: '#3d7a3f',
  rock: '#6b6f78',
  snow: '#eef2f5',
  cloud: 'rgba(255,255,255,0.85)',
  planeBody: '#ff7a1a',
  planeDark: '#c85a10',
  planeGlass: '#bfe8ff',
  ring: '#ffd23f',
  ringGlow: 'rgba(255,210,63,0.55)',
  hudPanel: 'rgba(8,20,32,0.72)',
  hudLine: '#7fd4ff',
  hudText: '#eaf6ff',
  hudWarn: '#ff5d4d',
  hudGood: '#7dff9a',
  bossHull: '#3a3f4a',
  bossAccent: '#ff3b30',
};
