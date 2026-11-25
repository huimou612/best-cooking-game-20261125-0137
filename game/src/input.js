// Keyboard and pointer input. Clicks are queued as logical (1280x720) points
// and taken once by the loop, so a click between two frames is never lost and
// never counted twice. Keys give one-shot actions the same way.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_TRASH = 4;
export const ACTION_MUTE = 8;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const TRASH = new Set(['KeyT', 'Backspace', 'Delete']);
const MUTE = new Set(['KeyM']);

import { H, W } from './config.js';

export function createInput(canvas) {
  let actions = 0;
  const clicks = [];

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H);
    const ox = (rect.width - W * scale) / 2;
    const oy = (rect.height - H * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (TRASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_TRASH;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toLogical(event));
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The click points since the last call, in logical pixels. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
