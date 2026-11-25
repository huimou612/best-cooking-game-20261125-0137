// Boot and the one loop: input is read every frame, the kitchen advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between five screens: title, play, paused, day complete and game over.
//
// ?seed=N fixes the order pattern. ?shot=serve|cook|rush|done|over (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, L, STEP } from './config.js';
import { COUNTER_ORDER } from './recipes.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  EVENT_BURN, EVENT_CHOP, EVENT_COOK, EVENT_DAY, EVENT_ERROR, EVENT_EXPIRE,
  EVENT_OVER, EVENT_PLATE, EVENT_READY, EVENT_SERVE, EVENT_TRASH,
  createKitchen,
} from './kitchen.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_TRASH, createInput } from './input.js';
import {
  SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen.state, scene.screen, scene.best, scene.dayDone);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let dayDone = 0;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Three lives. Serve the tickets before they run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (kitchen.state.coins > best) {
      best = kitchen.state.coins;
      saveBest(best);
    }
    announce(`Game over. You earned $${kitchen.state.coins}. Best $${best}.`);
  }

  // Play a sound for each event the kitchen raised.
  function soundFor(events) {
    if (events & EVENT_SERVE) audio.serve();
    if (events & EVENT_DAY) audio.day();
    if (events & EVENT_READY) audio.ding();
    if (events & EVENT_CHOP) audio.chop();
    if (events & EVENT_COOK) audio.sizzle();
    if (events & (EVENT_EXPIRE | EVENT_BURN | EVENT_ERROR)) audio.error();
  }

  function step() {
    const events = kitchen.update(STEP);
    soundFor(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_DAY) {
      dayDone = kitchen.state.day - 1;
      screen = SCREEN_DAY;
      announce(`Day ${dayDone} complete! Day ${kitchen.state.day} begins.`);
    } else if (events & EVENT_EXPIRE) {
      announce(`An order expired! ${kitchen.state.lives} ${kitchen.state.lives === 1 ? 'life' : 'lives'} left.`);
    }
  }

  // Route one click (logical pixels) to the kitchen control it hits.
  function handleClick(x, y) {
    audio.unlock();
    const s = kitchen.state;
    if (screen !== SCREEN_PLAY) return;
    // SERVE and TRASH buttons.
    const serveR = L.serve;
    if (x >= serveR.x + 16 && x <= serveR.x + serveR.w - 16 && y >= serveR.y + 48 && y <= serveR.y + 48 + 64) {
      const events = kitchen.serve();
      soundFor(events);
      return;
    }
    if (x >= serveR.x + 16 && x <= serveR.x + serveR.w - 16 && y >= serveR.y + 140 && y <= serveR.y + 180) {
      const events = kitchen.trashPlate();
      soundFor(events);
      return;
    }
    // Stove burners.
    for (let i = 0; i < 2; i += 1) {
      const cx = L.stove.x + 82 + i * 166;
      const cy = L.stove.y + 108;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= 75 * 75) {
        const events = kitchen.clickBurner(i);
        soundFor(events);
        return;
      }
    }
    // Cutting board.
    const b = L.board;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      const events = kitchen.clickBoard();
      soundFor(events);
      return;
    }
    // The plate: take the top layer off.
    const p = L.plate;
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
      const events = kitchen.clickPlate(s.plate.length - 1);
      soundFor(events);
      return;
    }
    // Ingredient counter buttons.
    const area = L.counter;
    const bw = (area.w - 5 * 12) / 6;
    for (let i = 0; i < COUNTER_ORDER.length; i += 1) {
      const bx = area.x + i * (bw + 12);
      const by = area.y + 26;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + 112) {
        const events = kitchen.useIngredient(COUNTER_ORDER[i]);
        soundFor(events);
        return;
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_TRASH && screen === SCREEN_PLAY) {
      soundFor(kitchen.trashPlate());
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_DAY) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    for (const click of input.takeClicks()) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_DAY) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else handleClick(click.x, click.y);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(kitchen.state, screen, best, dayDone);
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Click or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
