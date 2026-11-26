// Skyline Courier — save file. Progress (credits, upgrades, best mission)
// is kept in localStorage, guarded so a browser that blocks storage just
// plays without saving. Nothing here ever touches a cookie.

const SAVE_KEY = 'skyline-courier-save-v1';

export function loadSave() {
  const fallback = { credits: 0, upgrades: { engine: 0, hull: 0, tank: 0 }, bestMission: 0 };
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      credits: typeof parsed.credits === 'number' ? parsed.credits : 0,
      upgrades: {
        engine: parsed.upgrades?.engine | 0,
        hull: parsed.upgrades?.hull | 0,
        tank: parsed.upgrades?.tank | 0,
      },
      bestMission: parsed.bestMission | 0,
    };
  } catch {
    return fallback;
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable: the session just does not persist. Play on.
  }
}
