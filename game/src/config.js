// Sizzle & Serve — a fast cooking game. One screen: the order board on top, the
// kitchen (stove, cutting board, plate) in the middle, the ingredient counter
// at the bottom. Cook, chop, build the dish, serve it before the ticket runs out.

// Logical canvas size. The page scales it to fit the window.
export const W = 1280;
export const H = 720;

// The simulation's fixed step, in seconds.
export const STEP = 1 / 60;

// Timing (seconds).
export const DAY_SECONDS = 90; // a day lasts this long
export const PATTY_COOK_SECONDS = 4; // a raw patty on the stove
export const PATTY_BURN_SECONDS = 4; // grace before a cooked patty burns
export const SOUP_SIMMER_SECONDS = 3; // a soup pot on the stove
export const CHOPS_NEEDED = 3; // clicks to chop lettuce or tomato
export const MAX_LIVES = 3;
export const MAX_PLATE = 5; // most ingredients one plate can hold

// Colours: a warm kitchen. Cream walls, terracotta tiles, wooden counters.
export const C = {
  wall: '#f7e8c9',
  wallTile: '#eecf9a',
  floor: '#b85c38',
  floorTile: '#a34d2e',
  counter: '#8b5a2b',
  counterTop: '#c98a4b',
  board: '#e0a458',
  boardEdge: '#a06a2c',
  stove: '#3d3d4d',
  stoveTop: '#55556a',
  plate: '#fdfdf6',
  plateEdge: '#d9d9c8',
  ink: '#2b2118',
  inkSoft: '#6b5340',
  cream: '#fff6e0',
  red: '#d94f3d',
  green: '#4da34d',
  gold: '#f2b234',
  ticket: '#fffdf5',
  ticketEdge: '#d8c9a3',
  danger: '#c0392b',
  ok: '#2e9e4f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Layout rectangles, in logical pixels.
export const L = {
  hud: { x: 0, y: 0, w: W, h: 62 },
  orders: { x: 16, y: 74, w: W - 32, h: 118 },
  stove: { x: 16, y: 208, w: 330, h: 196 },
  board: { x: 366, y: 208, w: 300, h: 196 },
  plate: { x: 686, y: 208, w: 300, h: 196 },
  serve: { x: 1006, y: 208, w: 258, h: 196 },
  counter: { x: 16, y: 424, w: W - 32, h: 150 },
  help: { x: 16, y: 586, w: W - 32, h: 118 },
};

// One order ticket is 384 wide; three fit across the board with gaps.
export const TICKET_W = 384;
export const TICKET_H = 108;
export const TICKET_GAP = 20;

// Where the best score is kept between visits (this browser only).
export const BEST_KEY = 'sizzle-and-serve.best';
