// The screenshot scenes behind ?shot=serve|cook|rush|done|start. Each one sets
// the kitchen to a real, playable state — the same rules a player would reach
// — so the frame is what a short game really looks like, and the same seed
// always gives the same frame.

import { SCREEN_DAY, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// A fresh order ticket with a chosen dish and time left.
function ticket(kitchen, dish, timeLeft, timeMax) {
  return {
    id: kitchen.state.nextOrderId,
    dish,
    name: dish === 'burger' ? 'Burger' : dish === 'salad' ? 'Salad' : 'Soup',
    timeLeft,
    timeMax,
  };
}

/**
 * Set the kitchen to the named scene and return the screen to draw over it,
 * the best score to show, and (for the day-complete scene) the day that ended.
 */
export function stageShot(name, kitchen) {
  const s = kitchen.state;
  kitchen.reset();
  if (name === 'cook') {
    // A patty on the stove, lettuce on the board: the kitchen at work.
    s.coins = 8;
    s.dayTime = 74;
    s.orders = [ticket(kitchen, 'burger', 40, 48)];
    s.nextOrderId = 2;
    s.burners[0] = { kind: 'patty', phase: 'cooking', t: 2.8 };
    s.board = { kind: 'lettuce', phase: 'chopping', chops: 1 };
    return { screen: SCREEN_PLAY, best: 0, dayDone: 0 };
  }
  if (name === 'rush') {
    // Day 2, three tickets, one about to expire, a patty ready and a plate started.
    s.day = 2;
    s.coins = 56;
    s.dayTime = 22;
    s.lives = 2;
    s.servedTotal = 6;
    s.servedToday = 4;
    s.orders = [
      ticket(kitchen, 'burger', 6, 42),
      ticket(kitchen, 'salad', 18, 42),
      ticket(kitchen, 'soup', 30, 42),
    ];
    s.nextOrderId = 4;
    s.plate = ['bun', 'patty'];
    s.burners[0] = { kind: 'patty', phase: 'ready', t: 4.2 };
    s.board = { kind: 'tomato', phase: 'ready', chops: 3 };
    return { screen: SCREEN_PLAY, best: 56, dayDone: 0 };
  }
  if (name === 'done') {
    // Day 1 complete: the day-complete panel over a kitchen that just served five.
    s.day = 2;
    s.coins = 48;
    s.dayTime = 90;
    s.lives = 3;
    s.servedToday = 5;
    s.servedTotal = 5;
    s.orders = [ticket(kitchen, 'salad', 30, 42)];
    s.nextOrderId = 2;
    s.plate = ['lettuce', 'tomato', 'cheese'];
    return { screen: SCREEN_DAY, best: 48, dayDone: 1 };
  }
  if (name === 'over') {
    s.coins = 31;
    s.lives = 0;
    s.servedTotal = 4;
    s.orders = [];
    return { screen: SCREEN_OVER, best: 48, dayDone: 0 };
  }
  if (name === 'serve') {
    // The cover: a burger complete on the plate (SERVE lit), a patty cooking
    // and a chopped tomato waiting — the kitchen mid-service.
    s.coins = 24;
    s.dayTime = 62;
    s.servedTotal = 2;
    s.orders = [
      ticket(kitchen, 'burger', 32, 48),
      ticket(kitchen, 'salad', 28, 48),
    ];
    s.nextOrderId = 3;
    s.plate = ['bun', 'patty', 'lettuce', 'cheese'];
    s.burners[0] = { kind: 'patty', phase: 'cooking', t: 2.4 };
    s.board = { kind: 'tomato', phase: 'ready', chops: 3 };
    return { screen: SCREEN_PLAY, best: 24, dayDone: 0 };
  }
  // Any other name is the title screen.
  return { screen: SCREEN_TITLE, best: 0, dayDone: 0 };
}
