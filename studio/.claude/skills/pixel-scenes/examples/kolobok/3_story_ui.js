
// ---------------------------------------------------------------- words
const VERSES = [
  'I rolled from the bin and I rolled from the sill,',
  'I rolled from the miller, I rolled from the mill,',
  'I rolled from the knights and the stones on the hill,',
  'and I\u2019ll roll from you. I am rolling still.',
];
const FED_VERSE = 'I rolled from your flour, and I\u2019m hungry still.';
const STONE_LINES = ['NOT OURS.', 'NOT. OURS.', 'SOFT ONE. NOT OURS.', 'GO. NOT OURS.'];
const PEBBLE_LINES = ['not ours not ours not ours', 'not ours!', 'not ours, not ours'];
const ENDINGS = {
  blind: { title: 'Not ours', text: 'Nine sacks on the wheat and not one on the loaf. Tomorrow a mason gets paid for another stone.' },
  seen: { title: 'Seen', text: 'You saw it roll, and so did the road. Nobody blames the stones tonight. It\u2019s a little bigger for it.' },
  fed: { title: 'Fed', text: 'You saw it every time, and every time it drank the flour. It left singing a new verse. The verse is about you.' },
};

// ---------------------------------------------------------------- story
const S = {};
function resetStory() {
  Object.assign(S, { intro: 0, poleT: -1, prompted: false, songT: 10, verse: 0, newVerse: false, outT: -1, leaveT: -1, hintT: -1, missed: false, q: [] });
}
function later(delay, fn) { S.q.push({ at: G.pt + delay, fn }); S.q.sort((a, b) => a.at - b.at); }
function showCaption(text, dur, cls) { G.capUntil = G.t + (dur || 2.6); UI.caption(text, dur || 2.6, cls || ''); }
function capLater(delay, text, dur, cls) { later(delay, () => showCaption(text, dur, cls)); }
function stoneSpeak(line) {
  const L = line || STONE_LINES[G.stoneLine++ % STONE_LINES.length];
  showCaption(L, 2.6, 'stone');
  G.stoneTalk = 1.5;
  SFX.stone(L.split(/\s+/).length);
}
function pebbleSpeak() {
  const L = PEBBLE_LINES[G.pebLine++ % PEBBLE_LINES.length];
  showCaption(L, 2.2, 'pebble');
  G.pebTalk = 1.3;
  SFX.pebbles();
}
function storyPole() {
  S.poleT = G.pt;
  showCaption('The flour bell burst.', 2.6);
  capLater(2.9, 'There it is.', 2.4);
}
function registerHit() {
  G.hits++;
  B.grow += 0.8;
  G.hold = 1.3;
  S.newVerse = true;
  S.songT = Math.min(S.songT, 10);
  if (G.hits === 1) {
    later(0.7, () => stoneSpeak('NOT OURS.'));
    capLater(3.6, 'It drinks the flour.', 3);
    capLater(8.4, 'It\u2019s bigger now.', 3);
  } else if (G.hits === 3) capLater(7.6, 'Every sack makes it bigger.', 3.2);
}
function missNote() {
  if (S.missed) return;
  S.missed = true;
  capLater(0.9, 'Flour on the wheat. Nothing under it.', 3);
}
function startLeaving() {
  G.phase = 'leaving';
  S.leaveT = G.pt;
  const pts = [[B.x, B.z], [B.x + B.hx * 25, B.z + B.hz * 25], [-40, 360], [90, 700], [330, 1500], [504, 2160]];
  B.path = buildPath(pts, false, 30);
  B.s = 0;
  B.target = 17;
  showCaption('It takes the road.', 3.4);
}
function runStory(dt) {
  while (S.q.length && S.q[0].at <= G.pt) S.q.shift().fn();
  if (S.intro === 0 && G.pt > 2.2) { S.intro = 1; showCaption('Warm bread on the air. Nothing on the road.', 4.2); }
  if (S.intro === 1 && G.pt > 9.5 && B.z < 400) { S.intro = 2; showCaption('The crows are standing on nothing.', 4); }
  if (S.poleT >= 0 && !S.prompted && G.pt - S.poleT > 5.6) {
    S.prompted = true;
    if (G.thrown === 0) UI.prompt('Tap it to sling flour');
  }
  if (G.phase === 'play' && G.flour > 0 && !SACK && S.prompted && G.pt - Math.max(G.lastThrow, S.poleT) > 24 && G.pt - S.hintT > 30) {
    S.hintT = G.pt;
    UI.prompt('Aim where the crows stand');
    later(5, () => { if (G.phase === 'play') UI.prompt(''); });
  }
  S.songT -= dt;
  if (S.songT <= 0) {
    if (ballDist() < 190 && G.t > G.capUntil + 0.6) {
      const line = S.newVerse ? FED_VERSE : VERSES[S.verse++ % VERSES.length];
      S.newVerse = false;
      showCaption('\u201C' + line + '\u201D', 4.6, 'song');
      S.songT = 13 + Math.random() * 6;
    } else S.songT = 2;
  }
  if (G.phase === 'play' && G.flour === 0 && !SACK && S.outT < 0) { S.outT = G.pt; capLater(2.4, 'That was the last sack.', 3.2); }
  if (G.phase === 'play' && S.outT >= 0 && G.pt - S.outT > 10) startLeaving();
  if (G.phase === 'leaving' && (B.z > 560 || G.pt - S.leaveT > 24)) endGame();
}

// ---------------------------------------------------------------- endings
const EKEY = 'kolobok-endings';
let sessionEndings = [];
function loadEndings() {
  try { const v = JSON.parse(localStorage.getItem(EKEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function saveEnding(id) {
  const list = loadEndings();
  for (const e of sessionEndings) if (list.indexOf(e) < 0) list.push(e);
  if (list.indexOf(id) < 0) list.push(id);
  sessionEndings = list.slice();
  try { localStorage.setItem(EKEY, JSON.stringify(list)); } catch (e) { /* private mode: keep it for this visit */ }
  return list.length;
}
function endGame() {
  if (G.phase === 'end') return;
  G.phase = 'end';
  const id = G.hits === 0 ? 'blind' : G.hits <= 4 ? 'seen' : 'fed';
  const n = saveEnding(id);
  UI.prompt('');
  UI.ending(ENDINGS[id], n);
}

// ---------------------------------------------------------------- flow
function begin() {
  G.phase = 'play'; G.pt = 0; G.flour = FLOUR_MAX; G.hits = 0; G.thrown = 0; G.lastThrow = 0; G.hold = 0;
  resetStory();
  UI.title(false);
  UI.count(G.flour);
  B.path = LOOP; B.s = S_POLE - 150; B.jump = true; B.target = 8.5;
}
function restart() {
  UI.endingHide();
  COV.fill(0); FX[1] = 0;
  BURSTS.length = 0; PARTS.length = 0; SACK = null;
  B.R = R0; B.grow = 0;
  POLE.intact = true;
  initCrows();
  begin();
}
function hitStone(px, py) { return px >= STONEX - 2 && px < STONEX + STONE.w + 2 && py >= STONEY - 2 && py < STONEY + STONE.h; }
function hitPebbles(px, py) {
  for (const p of PEBS) if (px >= p.pbx - 3 && px < p.pbx + p.spr.w + 3 && py >= p.pby - 5 && py < p.pby + p.spr.h + 3) return true;
  return false;
}
function tap(px, py) {
  if (G.phase === 'title') { begin(); return; }
  if (G.phase === 'end') return;
  if (hitStone(px, py)) { stoneSpeak(); return; }
  if (hitPebbles(px, py)) { pebbleSpeak(); return; }
  if (G.phase !== 'play') return;
  if (G.flour <= 0) { if (!SACK) showCaption('No flour left in the village.', 2.4); return; }
  throwAt(px, py);
}
function aimAtLoaf() {
  const s = ballScreen();
  tap(s[0], s[1]);
}
function update(dt) {
  G.t += dt;
  if (G.phase === 'play' || G.phase === 'leaving') G.pt += dt;
  updateBall(dt);
  if (G.phase === 'play' && POLE.intact) checkPole();
  updateCrows(dt);
  updateSack(dt);
  updateBursts(dt);
  decayCov(dt);
  decayMaps(dt);
  if (G.stoneTalk > 0) G.stoneTalk -= dt;
  if (G.pebTalk > 0) G.pebTalk -= dt;
  if (G.phase === 'play' || G.phase === 'leaving') runStory(dt);
  const prox = G.phase === 'end' ? 0 : clamp((170 - ballDist()) / 110, 0, 1);
  SFX.setRumble(prox);
  SFX.song(dt, G.phase === 'title' ? prox * 0.5 : prox);
  G.cawT -= dt;
  if (G.cawT <= 0) { G.cawT = 7 + Math.random() * 8; if (prox > 0.25) SFX.caw(0); }
}
function init() {
  buildPalette(0);
  ROAD = buildPath(ROAD_PTS, false, 40);
  LOOP = buildPath(LOOP_PTS, true, 60);
  S_POLE = nearestS(LOOP, POLE.x, POLE.z);
  STONE = genStone();
  genSky();
  genTex();
  genLumps();
  B.path = LOOP; B.s = 0; B.jump = true;
  resetStory();
  // let it roll for a while first, so the valley already carries its track
  for (let k = 0; k < 1200; k++) { G.t += 1 / 15; updateBall(1 / 15); decayMaps(1 / 15); }
  initCrows();
}
function setH(h) { H = h; alloc(); genGround(); genForeground(); }

// ---------------------------------------------------------------- sound (synthesised, no files)
const MELODY = [440, 392, 349.2, 392, 440, 440, 0, 293.7, 349.2, 392, 440, 392, 349.2, 329.6, 293.7, 0];
const SFX = {
  ctx: null, out: null, buf: null, muted: false, rum: null, bus: null, noteT: 0, noteI: 0,
  init() {
    if (this.ctx || !IS_BROWSER) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      this.ctx = c;
      this.out = c.createGain(); this.out.gain.value = this.muted ? 0 : 0.6; this.out.connect(c.destination);
      const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.buf = b;
      // wind over the wheat
      const ws = c.createBufferSource(); ws.buffer = b; ws.loop = true;
      const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 520;
      const wg = c.createGain(); wg.gain.value = 0.035;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lg = c.createGain(); lg.gain.value = 0.022;
      lfo.connect(lg); lg.connect(wg.gain); ws.connect(wf); wf.connect(wg); wg.connect(this.out); ws.start(); lfo.start();
      // the loaf's weight on the ground
      const rs = c.createBufferSource(); rs.buffer = b; rs.loop = true;
      const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 95;
      const rg = c.createGain(); rg.gain.value = 0.0001;
      rs.connect(rf); rf.connect(rg); rg.connect(this.out); rs.start();
      this.rum = rg;
      // its song, muffled, as if through bread
      const bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 460;
      bf.connect(this.out);
      this.bus = bf;
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') { try { this.ctx.resume(); } catch (e) { /* not yet allowed */ } } },
  setMuted(m) { this.muted = m; if (this.ctx) this.out.gain.setTargetAtTime(m ? 0 : 0.6, this.ctx.currentTime, 0.05); },
  tone(f, dur, type, vol, f2, delay, bus) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, type, f, f2, q, delay) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.buf;
    const fl = c.createBiquadFilter(); fl.type = type || 'lowpass';
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.Q.value = q || 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.out);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  setRumble(level) { if (this.ctx && this.rum) this.rum.gain.setTargetAtTime(0.0001 + level * level * 0.32, this.ctx.currentTime, 0.4); },
  song(dt, prox) {
    if (!this.ctx) return;
    this.noteT -= dt;
    if (this.noteT > 0) return;
    this.noteT = 0.46;
    const f = MELODY[this.noteI++ % MELODY.length];
    if (prox < 0.12 || !f) return;
    const vol = 0.09 * prox;
    this.tone(f / 2, 0.55, 'triangle', vol, null, 0, this.bus);
    this.tone(f / 4, 0.55, 'sine', vol * 0.8, null, 0, this.bus);
  },
  sling() { this.noise(0.32, 0.09, 'bandpass', 500, 2400, 1.3); },
  burst() { this.noise(0.9, 0.3, 'lowpass', 2400, 160, 0.8); this.tone(85, 0.4, 'sine', 0.22, 42); },
  poleBurst() { this.tone(260, 0.2, 'sawtooth', 0.06, 80); this.noise(1.3, 0.34, 'lowpass', 2600, 140, 0.8, 0.05); this.tone(70, 0.6, 'sine', 0.26, 38, 0.05); },
  caw(delay) { const d = delay || 0; this.tone(640, 0.13, 'sawtooth', 0.03, 470, d); this.tone(610, 0.15, 'sawtooth', 0.026, 430, d + 0.21); },
  stone(words) { for (let k = 0; k < words; k++) { this.noise(0.3, 0.3, 'bandpass', 190, 150, 6, k * 0.4); this.tone(72, 0.3, 'sine', 0.14, 60, k * 0.4); } },
  pebbles() { for (let k = 0; k < 9; k++) this.tone(1900 + Math.random() * 900, 0.022, 'square', 0.028, null, k * 0.07 + Math.random() * 0.03); },
};

// ---------------------------------------------------------------- UI (DOM in the browser, a stub elsewhere)
let UI = null;
function stubUI() {
  const log = [];
  const f = name => (...a) => log.push([name, ...a]);
  return { log, caption: f('caption'), prompt: f('prompt'), count: f('count'), title: f('title'), ending: f('ending'), endingHide: f('endingHide'), fade: f('fade') };
}
function makeUI() {
  const $ = id => document.getElementById(id);
  const el = {
    stage: $('stage'), caption: $('caption'), prompt: $('prompt'), count: $('count'), title: $('title'), found: $('found'),
    ending: $('ending'), endTitle: $('endTitle'), endText: $('endText'), endFound: $('endFound'), again: $('again'), fade: $('fade'), mute: $('mute'),
  };
  let capTimer = null;
  return {
    el,
    caption(t, dur, cls) {
      el.caption.textContent = t;
      el.caption.className = 'shade on' + (cls ? ' ' + cls : '');
      clearTimeout(capTimer);
      capTimer = setTimeout(() => el.caption.classList.remove('on'), dur * 1000);
    },
    prompt(t) { el.prompt.textContent = t || ''; el.prompt.classList.toggle('on', !!t); },
    count(n) { el.count.textContent = n === null ? '' : n === 0 ? 'No flour left' : n === 1 ? '1 sack of flour' : n + ' sacks of flour'; },
    title(on, found) {
      el.title.classList.toggle('on', !!on);
      el.found.textContent = found ? 'Endings found: ' + found + ' of 3' : '';
    },
    ending(e, n) {
      el.endTitle.textContent = e.title; el.endText.textContent = e.text;
      el.endFound.textContent = 'Endings found: ' + n + ' of 3';
      el.ending.classList.add('on');
      el.count.textContent = '';
      setTimeout(() => { try { el.again.focus({ preventScroll: true }); } catch (err) { /* ignore */ } }, 60);
    },
    endingHide() { el.ending.classList.remove('on'); },
    fade(v, dur) { el.fade.style.transitionDuration = (dur || 0.6) + 's'; el.fade.style.opacity = v; },
  };
}
function boot() {
  UI = makeUI();
  init();
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = document.getElementById('stage'), wrap = document.getElementById('wrap');
  let IMG = null;
  function resize() {
    const aw = Math.max(1, wrap.clientWidth), ah = Math.max(1, wrap.clientHeight);
    const nh = clamp(Math.round((W * ah) / aw), H_MIN, H_MAX);
    if (nh !== H || !IMG) {
      setH(nh);
      canvas.width = W; canvas.height = H;
      IMG = ctx.createImageData(W, H);
      OUT32 = new Uint32Array(IMG.data.buffer);
    }
    const sc = Math.min(aw / W, ah / H);
    const sw = Math.floor(W * sc), sh = Math.floor(H * sc);
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
    document.documentElement.style.setProperty('--u', sw / 100 + 'px');
  }
  window.addEventListener('resize', resize);
  resize();
  const found = loadEndings().length;
  UI.title(true, found);
  UI.fade(0, 1.6);
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    SFX.init(); SFX.resume();
    const r = canvas.getBoundingClientRect();
    tap(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  });
  const unlock = () => { SFX.init(); SFX.resume(); };
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(t => window.addEventListener(t, unlock, { passive: true }));
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      if (G.phase === 'title') begin(); else aimAtLoaf();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!SFX.ctx) return;
    if (document.hidden) SFX.ctx.suspend(); else SFX.ctx.resume();
  });
  UI.el.mute.addEventListener('click', e => {
    e.stopPropagation();
    SFX.init();
    SFX.setMuted(!SFX.muted);
    UI.el.mute.textContent = SFX.muted ? 'Sound off' : 'Sound on';
    UI.el.mute.setAttribute('aria-pressed', SFX.muted ? 'true' : 'false');
    UI.el.mute.blur();
  });
  UI.el.again.addEventListener('click', e => { e.stopPropagation(); UI.el.again.blur(); restart(); });
  let last = 0, cost = 0, odd = false;
  function frame(ts) {
    const now = ts / 1000;
    let dt = last ? now - last : 1 / 60;
    last = now;
    dt = clamp(dt, 0, 0.1);
    update(dt);
    // on a slow phone, draw every other frame rather than stutter
    odd = !odd;
    if (cost < 12 || odd) {
      const a = performance.now();
      render(G.t);
      ctx.putImageData(IMG, 0, 0);
      cost = cost * 0.9 + (performance.now() - a) * 0.1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (IS_BROWSER) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
} else if (typeof module !== 'undefined') {
  UI = stubUI();
  module.exports = {
    init, setH, update, render, tap, begin, restart, throwAt, ballScreen, ballDist, aimAtLoaf,
    G, B, S, POLE, CROWS, COV, W, HY, SUNX, SUNY,
    get H() { return H; }, get covMax() { return FX[1]; }, get UI() { return UI; }, get SACK() { return SACK; },
    setOut(buf) { OUT32 = buf; },
    coatAll() { COV.fill(1); FX[1] = 1; },
  };
}
})();
