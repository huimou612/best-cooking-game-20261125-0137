// Drawing only: the kitchen's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred. Everything
// is drawn with canvas shapes — no image files — so the food, the tickets and
// the timer all read clearly when the screenshot is shrunk.

import { C, FONT, H, L, MAX_LIVES, TICKET_GAP, TICKET_H, TICKET_W, W } from './config.js';
import { COUNTER_ORDER, INGREDIENTS, RECIPES, plateMatches, recipeById } from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAY = 'day';
export const SCREEN_OVER = 'over';

const LIFE_R = 13;

// --- small helpers -------------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.2, y, x - r * 0.6, y - r, x, y - r * 0.3);
  ctx.bezierCurveTo(x + r * 0.6, y - r, x + r * 1.2, y, x, y + r * 0.9);
  ctx.fill();
}

// Draw one ingredient's icon, centred at (cx, cy), roughly `r` in radius.
export function drawIngredient(ctx, kind, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  if (kind === 'bun') {
    ctx.fillStyle = INGREDIENTS.bun.color;
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INGREDIENTS.bun.dark;
    ctx.fillRect(-r, r * 0.25, r * 2, r * 0.28);
    ctx.fillStyle = '#fff2cf';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.arc(i * r * 0.45, -r * 0.35, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty') {
    ctx.fillStyle = INGREDIENTS.patty.color;
    rr(ctx, -r, -r * 0.45, r * 2, r * 0.9, r * 0.4);
    ctx.fill();
    ctx.fillStyle = INGREDIENTS.patty.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.4, 0, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.1, r * 0.14, 0, Math.PI * 2);
    ctx.arc(0, r * 0.2, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'lettuce') {
    ctx.fillStyle = INGREDIENTS.lettuce.color;
    ctx.beginPath();
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const rad = i % 2 === 0 ? r : r * 0.62;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad * 0.7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INGREDIENTS.lettuce.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.5);
    ctx.lineTo(0, r * 0.5);
    ctx.stroke();
  } else if (kind === 'tomato') {
    ctx.fillStyle = INGREDIENTS.tomato.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f28a7a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbe3d8';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, r * 0.1, r * 0.2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = INGREDIENTS.cheese.color;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.5);
    ctx.lineTo(r, r * 0.5);
    ctx.lineTo(0, -r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INGREDIENTS.cheese.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.35, r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.2, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'soup') {
    ctx.fillStyle = '#4a4a58';
    rr(ctx, -r, -r * 0.5, r * 2, r * 1.05, r * 0.25);
    ctx.fill();
    ctx.fillStyle = INGREDIENTS.soup.color;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.42, r * 0.86, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.9);
    ctx.quadraticCurveTo(-r * 0.6, -r * 1.3, -r * 0.35, -r * 1.55);
    ctx.moveTo(r * 0.3, -r * 0.9);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.3, r * 0.25, -r * 1.55);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// --- renderer ------------------------------------------------------------

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / W, height / H);
    view.x = (width - W * view.scale) / 2;
    view.y = (height - H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? weight + ' ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function label(value, x, y, size, color) {
    text(value, x, y, size, color, 'left', '700');
  }

  // --- the room ----------------------------------------------------------

  function drawRoom() {
    context.fillStyle = C.wall;
    context.fillRect(0, 0, W, 208);
    context.fillStyle = C.wallTile;
    for (let x = 0; x < W; x += 96) {
      for (let y = 0; y < 208; y += 48) {
        if (((x + y) / 48) % 2 === 0) context.fillRect(x, y, 94, 46);
      }
    }
    context.fillStyle = C.floor;
    context.fillRect(0, 574, W, H - 574);
    context.fillStyle = C.floorTile;
    for (let x = 0; x < W; x += 128) {
      context.fillRect(x, 574, 4, H - 574);
      context.fillRect(x, 640, 124, 4);
    }
    // Wooden counter band behind the ingredient buttons.
    context.fillStyle = C.counter;
    rr(context, L.counter.x - 6, L.counter.y - 6, L.counter.w + 12, L.counter.h + 12, 14);
    context.fill();
    context.fillStyle = C.counterTop;
    rr(context, L.counter.x - 6, L.counter.y - 6, L.counter.w + 12, 26, 14);
    context.fill();
  }

  // --- HUD ---------------------------------------------------------------

  function drawHud(state, best) {
    context.fillStyle = '#2b2118';
    context.fillRect(0, 0, W, L.hud.h);
    context.textBaseline = 'alphabetic';
    label('SIZZLE & SERVE', 20, 40, 30, '#ffd98a');
    text(`Coins $${state.coins}`, 330, 40, 26, '#fff6e0', 'left', '700');
    text(`Day ${state.day}`, 500, 40, 26, '#fff6e0', 'left', '700');
    text(`Served ${state.servedTotal}`, 620, 40, 24, '#d8c9a3', 'left');
    // Lives as hearts, top right.
    const firstX = W - 24 - MAX_LIVES * (LIFE_R * 2 + 8) + 8;
    text('Lives', firstX - 14, 40, 24, '#fff6e0', 'right', '700');
    for (let i = 0; i < MAX_LIVES; i += 1) {
      heart(context, firstX + i * (LIFE_R * 2 + 8) + LIFE_R, 32, LIFE_R, i < state.lives ? '#e84c3d' : '#5a4a3a');
    }
    // The day timer: a bar across the bottom of the HUD.
    const frac = Math.max(0, state.dayTime / 90);
    context.fillStyle = '#5a4a3a';
    context.fillRect(0, L.hud.h - 8, W, 8);
    context.fillStyle = frac > 0.5 ? C.green : frac > 0.25 ? C.gold : C.danger;
    context.fillRect(0, L.hud.h - 8, W * frac, 8);
    const seconds = Math.ceil(Math.max(0, state.dayTime));
    text(`Day ends in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, firstX - 130, 40, 20, '#ffd98a', 'right');
    text(`Best $${best}`, 760, 40, 20, '#d8c9a3', 'left');
  }

  // --- order board -------------------------------------------------------

  function drawOrders(state) {
    context.textBaseline = 'alphabetic';
    label('ORDER BOARD', L.orders.x + 4, L.orders.y + 14, 18, C.inkSoft);
    const match = state.plate.length > 0 ? matchOrderOf(state) : null;
    for (let i = 0; i < 3; i += 1) {
      const x = L.orders.x + i * (TICKET_W + TICKET_GAP);
      const y = L.orders.y + 22;
      const order = state.orders[i];
      if (!order) {
        context.fillStyle = 'rgba(255,255,255,0.45)';
        rr(context, x, y, TICKET_W, TICKET_H, 12);
        context.fill();
        context.strokeStyle = C.ticketEdge;
        context.setLineDash([6, 6]);
        context.lineWidth = 2;
        rr(context, x, y, TICKET_W, TICKET_H, 12);
        context.stroke();
        context.setLineDash([]);
        text('waiting for the next order…', x + TICKET_W / 2, y + TICKET_H / 2 + 6, 18, C.inkSoft, 'center');
        continue;
      }
      const recipe = recipeById(order.dish);
      const isMatch = match !== null && match.id === order.id;
      context.fillStyle = C.ticket;
      rr(context, x, y, TICKET_W, TICKET_H, 12);
      context.fill();
      context.lineWidth = isMatch ? 4 : 2;
      context.strokeStyle = isMatch ? C.ok : C.ticketEdge;
      rr(context, x, y, TICKET_W, TICKET_H, 12);
      context.stroke();
      label(order.name, x + 16, y + 34, 26, C.ink);
      text(`$${recipe.price} + time bonus`, x + TICKET_W - 16, y + 32, 18, C.inkSoft, 'right', '700');
      // Ingredient icons for the dish.
      for (let k = 0; k < recipe.needs.length; k += 1) {
        const ix = x + 30 + k * 52;
        context.fillStyle = '#f3e9d2';
        context.beginPath();
        context.arc(ix, y + 66, 20, 0, Math.PI * 2);
        context.fill();
        drawIngredient(context, recipe.needs[k], ix, y + 66, 14);
        const onPlate = state.plate.indexOf(recipe.needs[k]) !== -1;
        if (onPlate) {
          context.strokeStyle = C.ok;
          context.lineWidth = 3;
          context.beginPath();
          context.arc(ix, y + 66, 20, 0, Math.PI * 2);
          context.stroke();
          context.fillStyle = C.ok;
          context.beginPath();
          context.arc(ix + 13, y + 52, 9, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = '#fff';
          context.lineWidth = 2.5;
          context.beginPath();
          context.moveTo(ix + 9, y + 52);
          context.lineTo(ix + 12, y + 55);
          context.lineTo(ix + 18, y + 48);
          context.stroke();
        }
      }
      if (isMatch) {
        context.fillStyle = C.ok;
        rr(context, x + TICKET_W - 108, y + 52, 92, 26, 13);
        context.fill();
        text('READY!', x + TICKET_W - 62, y + 71, 16, '#fff', 'center', '700');
      }
      // Countdown bar.
      const frac = Math.max(0, order.timeLeft / order.timeMax);
      context.fillStyle = '#e8ddc4';
      rr(context, x + 16, y + TICKET_H - 16, TICKET_W - 32, 8, 4);
      context.fill();
      context.fillStyle = frac > 0.5 ? C.green : frac > 0.25 ? C.gold : C.danger;
      rr(context, x + 16, y + TICKET_H - 16, (TICKET_W - 32) * frac, 8, 4);
      context.fill();
    }
  }

  function matchOrderOf(state) {
    for (let i = 0; i < state.orders.length; i += 1) {
      const recipe = recipeById(state.orders[i].dish);
      if (plateMatches(recipe.needs, state.plate)) return state.orders[i];
    }
    return null;
  }

  // --- stove, board, plate, serve ----------------------------------------

  function drawStove(state) {
    const r = L.stove;
    context.fillStyle = C.stove;
    rr(context, r.x, r.y, r.w, r.h, 12);
    context.fill();
    context.fillStyle = C.stoveTop;
    rr(context, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 8);
    context.fill();
    label('STOVE', r.x + 16, r.y + 30, 18, '#fff6e0');
    for (let i = 0; i < 2; i += 1) {
      const cx = r.x + 82 + i * 166;
      const cy = r.y + 108;
      const burner = state.burners[i];
      context.fillStyle = '#22222e';
      context.beginPath();
      context.arc(cx, cy, 62, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#77778a';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(cx, cy, 62, 0, Math.PI * 2);
      context.stroke();
      if (burner.phase === 'empty') {
        text('empty', cx, cy + 6, 16, '#8a8a9a', 'center');
      } else {
        const done = burner.kind === 'soup' ? 3 : 4;
        if (burner.phase === 'cooking') {
          const frac = Math.min(1, burner.t / done);
          context.strokeStyle = C.gold;
          context.lineWidth = 6;
          context.beginPath();
          context.arc(cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          context.stroke();
          drawIngredient(context, burner.kind, cx, cy, 34);
          text('cooking…', cx, cy + 78, 15, '#ffd98a', 'center', '700');
        } else if (burner.phase === 'ready') {
          const pulse = 1 + Math.sin(Date.now() / 180) * 0.08;
          context.strokeStyle = C.ok;
          context.lineWidth = 5;
          context.beginPath();
          context.arc(cx, cy, 70 * pulse, 0, Math.PI * 2);
          context.stroke();
          drawIngredient(context, burner.kind, cx, cy, 34);
          text('READY — click!', cx, cy + 78, 15, '#7be495', 'center', '700');
        } else {
          context.fillStyle = '#111';
          context.beginPath();
          context.arc(cx, cy, 34, 0, Math.PI * 2);
          context.fill();
          text('BURNT — click to bin', cx, cy + 78, 15, '#ff8a7a', 'center', '700');
        }
      }
    }
  }

  function drawBoard(state) {
    const r = L.board;
    context.fillStyle = C.boardEdge;
    rr(context, r.x, r.y, r.w, r.h, 12);
    context.fill();
    context.fillStyle = C.board;
    rr(context, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 8);
    context.fill();
    label('CUTTING BOARD', r.x + 16, r.y + 30, 18, '#5e3a1e');
    const board = state.board;
    const cx = r.x + r.w / 2;
    const cy = r.y + 108;
    if (board.phase === 'empty') {
      text('Click lettuce or tomato', cx, cy - 6, 16, '#7a5a34', 'center');
      text('on the counter to chop it', cx, cy + 18, 16, '#7a5a34', 'center');
    } else if (board.phase === 'chopping') {
      drawIngredient(context, board.kind, cx, cy, 40);
      context.fillStyle = '#e8ddc4';
      rr(context, cx - 90, cy + 56, 180, 10, 5);
      context.fill();
      context.fillStyle = C.green;
      rr(context, cx - 90, cy + 56, 180 * (board.chops / 3), 10, 5);
      context.fill();
      text(`CHOP! ${board.chops}/3 clicks`, cx, cy + 76, 16, '#5e3a1e', 'center', '700');
    } else {
      drawIngredient(context, board.kind, cx, cy, 40);
      text('CHOPPED — click to plate it', cx, cy + 78, 16, '#2e7d32', 'center', '700');
    }
  }

  function drawPlate(state) {
    const r = L.plate;
    context.fillStyle = C.counter;
    rr(context, r.x, r.y, r.w, r.h, 12);
    context.fill();
    label('PLATE', r.x + 16, r.y + 30, 18, '#ffd98a');
    const cx = r.x + r.w / 2;
    const cy = r.y + 128;
    // The plate itself.
    context.fillStyle = C.plateEdge;
    context.beginPath();
    context.ellipse(cx, cy, 118, 44, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = C.plate;
    context.beginPath();
    context.ellipse(cx, cy, 106, 38, 0, 0, Math.PI * 2);
    context.fill();
    if (state.plate.length === 0) {
      text('Empty plate —', cx, cy - 4, 16, C.inkSoft, 'center');
      text('build a dish here!', cx, cy + 18, 16, C.inkSoft, 'center');
    } else {
      // Stack the ingredients as layers, bottom first.
      const layers = state.plate;
      const layerH = 15;
      const baseY = cy + 22;
      for (let i = 0; i < layers.length; i += 1) {
        const kind = layers[i];
        const y = baseY - i * layerH - 8;
        const w = 150 - i * 8;
        context.fillStyle = INGREDIENTS[kind].color;
        if (kind === 'bun') {
          context.beginPath();
          context.arc(cx, y + 6, w / 2, Math.PI, 0);
          context.closePath();
          context.fill();
        } else if (kind === 'soup') {
          context.fillStyle = '#4a4a58';
          rr(context, cx - w / 2, y - 6, w, 16, 6);
          context.fill();
          context.fillStyle = INGREDIENTS.soup.color;
          rr(context, cx - w / 2 + 4, y - 6, w - 8, 7, 3);
          context.fill();
        } else {
          rr(context, cx - w / 2, y - 4, w, 13, 6);
          context.fill();
        }
      }
      // A bun on top caps a burger.
      text(`${layers.length} layer${layers.length > 1 ? 's' : ''} — click one to take it off`, cx, cy + 56, 14, C.inkSoft, 'center');
    }
  }

  function drawServe(state) {
    const r = L.serve;
    const match = state.plate.length > 0 ? matchOrderOf(state) : null;
    context.fillStyle = '#2b2118';
    rr(context, r.x, r.y, r.w, r.h, 12);
    context.fill();
    label('SERVE IT', r.x + 16, r.y + 30, 18, '#ffd98a');
    const bx = r.x + 16;
    const by = r.y + 48;
    const bw = r.w - 32;
    const bh = 64;
    const ready = match !== null;
    const pulse = ready ? 1 + Math.sin(Date.now() / 200) * 0.04 : 1;
    context.save();
    context.translate(bx + bw / 2, by + bh / 2);
    context.scale(pulse, pulse);
    context.fillStyle = ready ? C.ok : '#6b655c';
    rr(context, -bw / 2, -bh / 2, bw, bh, 14);
    context.fill();
    context.restore();
    text('SERVE', bx + bw / 2, by + 42, 30, '#fff', 'center', '700');
    if (ready) {
      const recipe = recipeById(match.dish);
      text(`${recipe.name} — $${recipe.price}+`, bx + bw / 2, by + bh + 26, 17, '#7be495', 'center', '700');
    } else {
      text('match a ticket first', bx + bw / 2, by + bh + 26, 15, '#b8ab8d', 'center');
    }
    // Trash button.
    const tx = r.x + 16;
    const ty = r.y + 140;
    context.fillStyle = '#5a3a34';
    rr(context, tx, ty, r.w - 32, 40, 10);
    context.fill();
    text('TRASH PLATE', tx + (r.w - 32) / 2, ty + 27, 17, '#ffd9d0', 'center', '700');
  }

  // --- ingredient counter ------------------------------------------------

  function drawCounter(state) {
    const area = L.counter;
    label('INGREDIENTS — click to use', area.x + 4, area.y - 8 + 18, 18, '#ffd98a');
    const bw = (area.w - 5 * 12) / 6;
    for (let i = 0; i < COUNTER_ORDER.length; i += 1) {
      const kind = COUNTER_ORDER[i];
      const ing = INGREDIENTS[kind];
      const x = area.x + i * (bw + 12);
      const y = area.y + 26;
      const h = 112;
      let dim = false;
      if (ing.prep === 'stove' && state.burners.every((b) => b.phase !== 'empty')) dim = true;
      if (ing.prep === 'board' && state.board.phase !== 'empty') dim = true;
      context.globalAlpha = dim ? 0.55 : 1;
      context.fillStyle = '#fff6e0';
      rr(context, x, y, bw, h, 12);
      context.fill();
      context.strokeStyle = C.ticketEdge;
      context.lineWidth = 2;
      rr(context, x, y, bw, h, 12);
      context.stroke();
      drawIngredient(context, kind, x + bw / 2, y + 42, 30);
      label(ing.name, x + bw / 2, y + 88, 20, C.ink);
      context.textAlign = 'center';
      const hint = ing.prep === 'stove' ? 'needs the stove' : ing.prep === 'board' ? 'needs chopping' : 'straight to plate';
      text(hint, x + bw / 2, y + 106, 13, C.inkSoft, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawHelp() {
    const r = L.help;
    context.fillStyle = 'rgba(43,33,24,0.85)';
    rr(context, r.x, r.y, r.w, r.h, 12);
    context.fill();
    context.textBaseline = 'alphabetic';
    text('HOW TO PLAY', r.x + 20, r.y + 30, 18, '#ffd98a', 'left', '700');
    text('1. Click ingredients below — patty & soup go on the stove, lettuce & tomato on the board, bun & cheese straight on the plate.', r.x + 20, r.y + 60, 18, '#fff6e0', 'left');
    text('2. Click a ready burner or a chopped pile to put it on the plate. Click a layer to take it off.', r.x + 20, r.y + 86, 18, '#fff6e0', 'left');
    text('3. When the plate matches a ticket, SERVE lights up — send it out before the timer runs out. Expired orders cost a life!', r.x + 20, r.y + 112, 18, '#fff6e0', 'left');
    if (stateToast) {
      context.fillStyle = '#ffd98a';
      rr(context, W / 2 - 260, r.y - 44, 520, 34, 17);
      context.fill();
      text(stateToast, W / 2, r.y - 20, 18, '#2b2118', 'center', '700');
    }
  }

  let stateToast = '';

  // --- panels ------------------------------------------------------------

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34 + 70;
    const x = (W - width) / 2;
    const y = (H - height) / 2;
    context.fillStyle = 'rgba(20,14,8,0.55)';
    context.fillRect(0, 0, W, H);
    context.fillStyle = '#fffdf5';
    rr(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = accent || C.gold;
    context.lineWidth = 4;
    rr(context, x, y, width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, W / 2, y + 76, 46, C.ink, 'center', '700');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], W / 2, y + 128 + i * 34, 21, C.inkSoft, 'center');
    }
    text(prompt, W / 2, y + height - 34, 22, C.red, 'center', '700');
  }

  // --- main draw ---------------------------------------------------------

  function draw(state, screen, best, dayDone) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#11141b';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawRoom();
    drawHud(state, best);
    drawOrders(state);
    drawStove(state);
    drawBoard(state);
    drawPlate(state);
    drawServe(state);
    drawCounter(state);
    stateToast = state.toastT > 0 ? state.toast : '';
    drawHelp();
    context.textBaseline = 'alphabetic';
    if (screen === SCREEN_TITLE) {
      drawPanel('SIZZLE & SERVE', [
        'Run your own kitchen: cook, chop, plate and serve',
        'before the order tickets run out. Three dishes,',
        `three lives, and the rush only gets faster. Best $${best}.`,
      ], 'Click or press Space to start');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The stove is off and the tickets wait.'], 'Press P or click to resume');
    } else if (screen === SCREEN_DAY) {
      drawPanel(`Day ${dayDone} complete!`, [
        `You served ${state.servedToday} dishes and banked a $10 bonus.`,
        `Day ${state.day} brings faster orders — keep the pans hot!`,
        `Coins $${state.coins}  •  Lives ${state.lives}`,
      ], 'Click or press Space for the next day', C.ok);
    } else if (screen === SCREEN_OVER) {
      drawPanel('Game over', [
        `You served ${state.servedTotal} dishes and earned $${state.coins}.`,
        `Best $${best}. The kitchen will miss you.`,
      ], 'Click or press Space to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
