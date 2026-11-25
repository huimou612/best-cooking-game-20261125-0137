// The dishes and what goes in them. Every dish is a set of ingredients; the
// order of ingredients on the plate does not matter, only the set.

// An ingredient knows how it is prepared:
//   direct — clicks straight onto the plate (bun, cheese)
//   stove  — cooks on a stove burner first (patty, soup)
//   board  — is chopped on the cutting board first (lettuce, tomato)
export const INGREDIENTS = {
  bun: { name: 'Bun', prep: 'direct', color: '#e8b96a', dark: '#c98f3d' },
  patty: { name: 'Patty', prep: 'stove', color: '#8a5a33', dark: '#5e3a1e' },
  lettuce: { name: 'Lettuce', prep: 'board', color: '#6fbf4a', dark: '#3f8f2a' },
  tomato: { name: 'Tomato', prep: 'board', color: '#e84c3d', dark: '#b3271e' },
  cheese: { name: 'Cheese', prep: 'direct', color: '#f7c948', dark: '#d9a41f' },
  soup: { name: 'Soup', prep: 'stove', color: '#e07b39', dark: '#a34d1c' },
};

// The order the ingredient buttons appear on the counter, left to right.
export const COUNTER_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'soup'];

// Dishes. price is what a served dish pays, before the time bonus.
export const RECIPES = [
  { id: 'burger', name: 'Burger', needs: ['bun', 'patty', 'lettuce', 'cheese'], price: 12, color: '#d94f3d' },
  { id: 'salad', name: 'Salad', needs: ['lettuce', 'tomato', 'cheese'], price: 9, color: '#4da34d' },
  { id: 'soup', name: 'Soup', needs: ['soup', 'tomato'], price: 10, color: '#e07b39' },
];

export function recipeById(id) {
  for (let i = 0; i < RECIPES.length; i += 1) {
    if (RECIPES[i].id === id) return RECIPES[i];
  }
  return RECIPES[0];
}

// Does the plate's set of ingredients match this dish exactly?
export function plateMatches(needs, plate) {
  if (needs.length !== plate.length) return false;
  const wanted = needs.slice().sort();
  const have = plate.slice().sort();
  for (let i = 0; i < wanted.length; i += 1) {
    if (wanted[i] !== have[i]) return false;
  }
  return true;
}
