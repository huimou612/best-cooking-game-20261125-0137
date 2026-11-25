// The kitchen: orders, the stove, the cutting board, the plate, the day.
// Pure state and rules — no drawing, no input. The loop calls update(dt) in
// fixed steps and reads the event flags to play sounds and announcements.

import {
  CHOPS_NEEDED, DAY_SECONDS, MAX_LIVES, MAX_PLATE,
  PATTY_BURN_SECONDS, PATTY_COOK_SECONDS, SOUP_SIMMER_SECONDS,
} from './config.js';
import { INGREDIENTS, RECIPES, plateMatches, recipeById } from './recipes.js';

export const EVENT_SERVE = 1;
export const EVENT_EXPIRE = 2;
export const EVENT_OVER = 4;
export const EVENT_DAY = 8;
export const EVENT_CHOP = 16;
export const EVENT_COOK = 32;
export const EVENT_READY = 64;
export const EVENT_BURN = 128;
export const EVENT_PLATE = 256;
export const EVENT_ERROR = 512;
export const EVENT_TRASH = 1024;

// How long a dish's ticket lasts, and how often a new one arrives, by day.
function maxOrders(day) {
  return Math.min(1 + day, 3);
}
function orderSeconds(day) {
  return Math.max(48 - (day - 1) * 6, 30);
}
function spawnSeconds(day) {
  return Math.max(12 - (day - 1) * 2, 7);
}
function cookSeconds(kind) {
  return kind === 'soup' ? SOUP_SIMMER_SECONDS : PATTY_COOK_SECONDS;
}

function newOrder(random, day, id) {
  const dish = RECIPES[Math.floor(random() * RECIPES.length)];
  const seconds = orderSeconds(day);
  return { id, dish: dish.id, name: dish.name, timeLeft: seconds, timeMax: seconds };
}

export function createKitchen(random) {
  const state = {
    day: 1,
    coins: 0,
    lives: MAX_LIVES,
    dayTime: DAY_SECONDS,
    orders: [],
    // Two stove burners. phase: empty | cooking | ready | burnt.
    burners: [
      { kind: null, phase: 'empty', t: 0 },
      { kind: null, phase: 'empty', t: 0 },
    ],
    // The cutting board. phase: empty | chopping | ready.
    board: { kind: null, phase: 'empty', chops: 0 },
    plate: [],
    servedToday: 0,
    servedTotal: 0,
    spawnTimer: 6,
    nextOrderId: 1,
    toast: '',
    toastT: 0,
  };

  function say(message) {
    state.toast = message;
    state.toastT = 2.2;
  }

  function spawnOrder() {
    state.orders.push(newOrder(random, state.day, state.nextOrderId));
    state.nextOrderId += 1;
  }

  function reset() {
    state.day = 1;
    state.coins = 0;
    state.lives = MAX_LIVES;
    state.dayTime = DAY_SECONDS;
    state.orders = [];
    state.burners[0] = { kind: null, phase: 'empty', t: 0 };
    state.burners[1] = { kind: null, phase: 'empty', t: 0 };
    state.board = { kind: null, phase: 'empty', chops: 0 };
    state.plate = [];
    state.servedToday = 0;
    state.servedTotal = 0;
    state.spawnTimer = 8;
    state.nextOrderId = 1;
    state.toast = '';
    state.toastT = 0;
    spawnOrder();
    spawnOrder();
  }

  // Put an ingredient onto the plate. False when it cannot go there.
  function addToPlate(kind) {
    if (state.plate.length >= MAX_PLATE) return false;
    if (state.plate.indexOf(kind) !== -1) return false;
    state.plate.push(kind);
    return true;
  }

  // Click an ingredient on the counter. It goes to the stove, the board or the
  // plate, depending on how it is prepared.
  function useIngredient(kind) {
    const prep = INGREDIENTS[kind].prep;
    if (prep === 'direct') {
      if (!addToPlate(kind)) {
        say('Plate is full or already has it!');
        return EVENT_ERROR;
      }
      return EVENT_PLATE;
    }
    if (prep === 'stove') {
      for (let i = 0; i < state.burners.length; i += 1) {
        if (state.burners[i].phase === 'empty') {
          state.burners[i] = { kind, phase: 'cooking', t: 0 };
          return EVENT_COOK;
        }
      }
      say('Both burners are busy!');
      return EVENT_ERROR;
    }
    // board
    if (state.board.phase !== 'empty') {
      say('The board is busy!');
      return EVENT_ERROR;
    }
    state.board = { kind, phase: 'chopping', chops: 0 };
    return EVENT_PLATE;
  }

  // Click a stove burner: collect it when ready, bin it when burnt.
  function clickBurner(index) {
    const burner = state.burners[index];
    if (burner.phase === 'ready') {
      if (!addToPlate(burner.kind)) {
        say('Plate is full or already has it!');
        return EVENT_ERROR;
      }
      state.burners[index] = { kind: null, phase: 'empty', t: 0 };
      return EVENT_PLATE;
    }
    if (burner.phase === 'burnt') {
      state.burners[index] = { kind: null, phase: 'empty', t: 0 };
      say('Burnt! Binned.');
      return EVENT_TRASH;
    }
    return 0;
  }

  // Click the cutting board: chop while it is chopping, collect when ready.
  function clickBoard() {
    const board = state.board;
    if (board.phase === 'chopping') {
      board.chops += 1;
      if (board.chops >= CHOPS_NEEDED) board.phase = 'ready';
      return EVENT_CHOP;
    }
    if (board.phase === 'ready') {
      if (!addToPlate(board.kind)) {
        say('Plate is full or already has it!');
        return EVENT_ERROR;
      }
      state.board = { kind: null, phase: 'empty', chops: 0 };
      return EVENT_PLATE;
    }
    return 0;
  }

  // Click a layer on the plate to take it off; the trash button clears all.
  function clickPlate(index) {
    if (index < 0 || index >= state.plate.length) return 0;
    state.plate.splice(index, 1);
    return EVENT_TRASH;
  }
  function trashPlate() {
    if (state.plate.length === 0) return 0;
    state.plate = [];
    say('Plate cleared.');
    return EVENT_TRASH;
  }

  // Serve the plate when it matches an order. Pays the dish price plus a
  // bonus for serving fast. Returns the events that fired.
  function serve() {
    for (let i = 0; i < state.orders.length; i += 1) {
      const order = state.orders[i];
      const recipe = recipeById(order.dish);
      if (!plateMatches(recipe.needs, state.plate)) continue;
      const bonus = Math.round((order.timeLeft / order.timeMax) * 4);
      const earned = recipe.price + bonus;
      state.coins += earned;
      state.servedToday += 1;
      state.servedTotal += 1;
      state.orders.splice(i, 1);
      state.plate = [];
      state.spawnTimer = Math.min(state.spawnTimer, 2);
      say(`${recipe.name} served! +$${earned}`);
      return EVENT_SERVE;
    }
    say('That plate matches no order!');
    return EVENT_ERROR;
  }

  // Does the plate match any order right now (so SERVE lights up)?
  function matchingOrder() {
    for (let i = 0; i < state.orders.length; i += 1) {
      const recipe = recipeById(state.orders[i].dish);
      if (plateMatches(recipe.needs, state.plate)) return state.orders[i];
    }
    return null;
  }

  function update(dt) {
    let events = 0;
    if (state.toastT > 0) state.toastT -= dt;

    // The day clock.
    state.dayTime -= dt;
    if (state.dayTime <= 0) {
      state.day += 1;
      state.dayTime = DAY_SECONDS;
      state.coins += 10;
      state.servedToday = 0;
      say(`Day ${state.day}! Faster orders. +$10 bonus`);
      events |= EVENT_DAY;
    }

    // Order tickets tick down; an expired one costs a life.
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) {
        state.orders.splice(i, 1);
        state.lives -= 1;
        say(`${order.name} expired! -1 life`);
        events |= EVENT_EXPIRE;
        if (state.lives <= 0) {
          state.lives = 0;
          events |= EVENT_OVER;
        }
      }
    }

    // Burners cook, then go ready, then burn if left alone.
    for (let i = 0; i < state.burners.length; i += 1) {
      const burner = state.burners[i];
      if (burner.phase === 'empty') continue;
      burner.t += dt;
      const done = cookSeconds(burner.kind);
      if (burner.phase === 'cooking' && burner.t >= done) {
        burner.phase = 'ready';
        events |= EVENT_READY;
      } else if (burner.phase === 'ready' && burner.t >= done + PATTY_BURN_SECONDS) {
        burner.phase = 'burnt';
        say('Something burnt on the stove!');
        events |= EVENT_BURN;
      }
    }

    // New orders arrive while there is room on the board.
    if (state.orders.length < maxOrders(state.day)) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnOrder();
        state.spawnTimer = spawnSeconds(state.day);
      }
    }
    return events;
  }

  reset();
  return {
    state,
    reset,
    useIngredient,
    clickBurner,
    clickBoard,
    clickPlate,
    trashPlate,
    serve,
    matchingOrder,
    update,
  };
}
