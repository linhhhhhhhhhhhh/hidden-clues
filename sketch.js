// Hidden Clues — Step 5: roles + partner UI
// p5.js 2.3.2 + p5-phone 1.16.1

let camX = 0; // camera: world coords of the view's top-left
let camY = 0;
let pressX = 0; // pointer position at press, for drag deltas
let pressY = 0;
let downX = 0; // original press position — never touched by drag deltas,
let downY = 0; // so mouseReleased can tell a tap from a drag (Step 10)

// --- roles (Step 5) ---
const ROLE_KEY = 'hidden-clues-role'; // sessionStorage: per tab/phone, survives reload
let myRole = 0; // 0 = not pinned yet, else 1 or 2
const livePeers = new Set(); // other phones we know to be in the room

// --- world layout (Step 7) ---
let symbols = null; // eight placeholder positions, normalized 0..1 within the world
let symbolsSeed = null; // the seed they were built from
const PAIR_COLORS = [
  [230, 57, 70], // pair A
  [69, 123, 157], // pair B
  [42, 157, 143], // pair C
  [244, 162, 97] // pair D
];

// --- visibility ladder (Step 8) ---
// own unfound 10%, partner unfound 5%, own found 100%, partner found 50%
function symbolAlpha(s) {
  const st = window.shared;
  if (!st) return 0.05;
  const mine = (s.side === 'TEAR') === (myRole !== 2); // TEAR belongs to player 1
  const found = mine
    ? (myRole === 2 ? st.p2Found : st.p1Found)[s.pair - 1]
    : (myRole === 2 ? st.p1Found : st.p2Found)[s.pair - 1];
  if (mine) return found ? 1 : 0.1;
  return found ? 0.5 : 0.05;
}

// only your own unfound symbol can be claimed (Step 10 uses this)
function isClaimable(s) {
  const st = window.shared;
  if (!st || myRole === 0) return false;
  const mine = (s.side === 'TEAR') === (myRole !== 2);
  const found = (myRole === 2 ? st.p2Found : st.p1Found)[s.pair - 1];
  return mine && !found;
}

// --- claiming (Step 10) ---
// A claim needs a tap within 35 px of an own unfound symbol whose centre is
// inside the scanner window; overlapping candidates resolve to the one
// nearest the window centre. On success only my own found array is written —
// the partner's key is never touched.
function tryClaim(tapX, tapY) {
  const st = window.shared;
  if (!st || myRole === 0 || !symbols) return false;

  const worldW = width * 3;
  const worldH = height * 3;
  const side = width * 0.6;
  const winX = width / 2 - side / 2;
  const winY = height / 2 - side / 2;

  let best = null;
  let bestToCentre = Infinity;
  for (const s of symbols) {
    if (!isClaimable(s)) continue; // own unfound only — partner symbols never claim
    const sx = s.nx * worldW - camX;
    const sy = s.ny * worldH - camY;
    // the symbol's centre must sit inside the scanner window
    if (sx < winX || sx > winX + side || sy < winY || sy > winY + side) continue;
    // 35 px tap tolerance
    if (Math.hypot(tapX - sx, tapY - sy) > 35) continue;
    // ties resolve to the symbol nearest the window centre
    const toCentre = Math.hypot(sx - width / 2, sy - height / 2);
    if (toCentre < bestToCentre) {
      bestToCentre = toCentre;
      best = s;
    }
  }
  if (!best) return false;

  // write only my own found array
  const key = myRole === 2 ? 'p2Found' : 'p1Found';
  const arr = [0, 1, 2, 3].map(i => !!st[key][i]);
  arr[best.pair - 1] = true;
  shareSet(key, arr);
  return true;
}

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // --- Share config (plan: exact values) ---
  shareSetup({
    host: 'https://p5-phone-share.npuckett.workers.dev', // the class server
    room: 'a1-iris',                                     // your room
    app: 'hidden-clues',
    shared: {
      seed: null,
      p1Found: [false, false, false, false],
      p2Found: [false, false, false, false]
    },
    me: { name: 'emma' },
    quiet: true // the sketch reads only `shared`
  });
  // One combined tap: joins the room and keeps the screen on.
  enablePermissionsTap(['share'], 'Tap to join');
  // After shareSetup() the QR carries the room join link (desktop only).
  showDesktopQr();

  // start at the world centre (the world is 3× the screen)
  camX = width;
  camY = height;
}

function draw() {
  const worldW = width * 3;
  const worldH = height * 3;

  // keep the view inside the world (also after a resize)
  camX = constrain(camX, 0, worldW - width);
  camY = constrain(camY, 0, worldH - height);

  background(255); // white background

  // --- pin my role the moment the room is up ---
  // First phone in (shareIsHost) = player 1; then pin in sessionStorage so a
  // reload or backgrounding can never swap the role. sessionStorage, not
  // localStorage: two windows on one laptop would share one localStorage.
  if (myRole === 0 && window.shareConnected && !window.shareError) {
    const pinned = sessionStorage.getItem(ROLE_KEY);
    myRole = pinned ? Number(pinned) : window.shareIsHost ? 1 : 2;
    sessionStorage.setItem(ROLE_KEY, String(myRole));
    shareSetMe('role', myRole); // partners read this from guests (quiet mode)
  }

  // --- one seed (Step 6): only the host writes it, and only if missing ---
  // If both phones rolled one, the two worlds would diverge. Writing from
  // draw() keeps retrying until the room echoes it back, so it self-heals.
  if (
    window.shareConnected &&
    !window.shareError &&
    window.shared &&
    window.shareIsHost &&
    window.shared.seed == null
  ) {
    shareSet('seed', Math.floor(Math.random() * 2147483647));
  }

  // --- build the world once the seed is here (Step 7) ---
  const seedVal = window.shared ? window.shared.seed : null;
  if (seedVal != null && symbolsSeed !== seedVal) {
    symbols = buildWorld(seedVal);
    symbolsSeed = seedVal;
  }

  // --- world (translated by the camera) ---
  push();
  translate(-camX, -camY);

  // faint grid
  const spacing = width / 5;
  stroke(0, 0, 0, 30);
  strokeWeight(1);
  const firstX = Math.ceil(camX / spacing) * spacing;
  for (let x = firstX; x <= camX + width; x += spacing) {
    line(x, camY, x, camY + height);
  }
  const firstY = Math.ceil(camY / spacing) * spacing;
  for (let y = firstY; y <= camY + height; y += spacing) {
    line(camX, y, camX + width, y);
  }

  // world boundary
  noFill();
  stroke(0, 0, 0, 90);
  strokeWeight(3);
  rect(0, 0, worldW, worldH);

  // --- placeholder symbols (Step 8: ladder via tint + fill alpha) ---
  // circle = TEAR side, square = ACRE side; letter = pair A..D (shared colour)
  // tint() is the opacity vehicle for images (Step 12); p5 2.3.2 ignores tint
  // for shapes, so shapes carry the same alpha in fill()/stroke().
  if (symbols) {
    const d = 96;
    textAlign(CENTER, CENTER);
    textSize(34);
    textStyle(BOLD);
    for (const s of symbols) {
      const sx = s.nx * worldW;
      const sy = s.ny * worldH;
      const col = PAIR_COLORS[s.pair - 1];
      const a = Math.round(symbolAlpha(s) * 255);
      tint(255, a);
      fill(col[0], col[1], col[2], a);
      stroke(0, a);
      strokeWeight(3);
      if (s.side === 'TEAR') {
        circle(sx, sy, d);
      } else {
        rect(sx - d / 2, sy - d / 2, d, d);
      }
      fill(0, a);
      noStroke();
      text('ABCD'[s.pair - 1], sx, sy + 2);
      noTint();
    }
    textStyle(NORMAL);
  }

  pop();

  // --- scanner window (screen space, from Step 1) ---
  const side = width * 0.6;
  const x = width / 2 - side / 2;
  const y = height / 2 - side / 2;

  // Thin border
  noFill();
  stroke(0, 0, 0, 50);
  strokeWeight(1);
  rect(x, y, side, side);

  // Faint crosshair at the centre
  stroke(0, 40);
  strokeWeight(1);
  const arm = 18;
  line(width / 2 - arm, height / 2, width / 2 + arm, height / 2);
  line(width / 2, height / 2 - arm, width / 2, height / 2 + arm);

  // Four corner brackets
  stroke(0, 160);
  strokeWeight(3);
  const bracket = side * 0.12;
  // top-left
  line(x, y, x + bracket, y);
  line(x, y, x, y + bracket);
  // top-right
  line(x + side, y, x + side - bracket, y);
  line(x + side, y, x + side, y + bracket);
  // bottom-left
  line(x, y + side, x + bracket, y + side);
  line(x, y + side, x, y + side - bracket);
  // bottom-right
  line(x + side, y + side, x + side - bracket, y + side);
  line(x + side, y + side, x + side, y + side - bracket);

  drawConnectionStatus();
  drawTopBar();
  drawInvite();
  drawWaitingForWorld();
}

// --- waiting for the seed (Step 6) ---
function drawWaitingForWorld() {
  const waiting =
    window.shareConnected && !window.shareError && window.shared && window.shared.seed == null;
  if (!waiting) return;

  push();
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  noStroke();
  fill(0);
  textSize(15);
  text('Waiting for world…', width / 2, height - 112);
  pop();
}

// --- world building (Step 7) ---

// deterministic PRNG: same seed → same sequence on every phone
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Eight positions: four pairs × two sides. Pair k = TEAR-k + ACRE-k.
// Positions are stored as world fractions so every screen size gets the
// same layout. Minimum spacing keeps symbols from stacking up.
function buildWorld(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  const minD = 0.16; // minimum spacing in world fractions
  let guard = 0;
  while (pts.length < 8 && guard++ < 5000) {
    const p = { x: 0.1 + rand() * 0.8, y: 0.1 + rand() * 0.8 };
    if (pts.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= minD)) pts.push(p);
  }
  // deterministic padding if rejection sampling ever gives up (never expected)
  const fallback = [
    [0.15, 0.15],
    [0.85, 0.15],
    [0.15, 0.85],
    [0.85, 0.85],
    [0.5, 0.5],
    [0.5, 0.15],
    [0.15, 0.5],
    [0.85, 0.5]
  ];
  let f = 0;
  while (pts.length < 8) {
    const g = fallback[f++];
    pts.push({ x: g[0], y: g[1] });
  }
  return pts.map((p, i) => ({
    nx: p.x,
    ny: p.y,
    pair: Math.floor(i / 2) + 1, // 1..4
    side: i % 2 === 0 ? 'TEAR' : 'ACRE'
  }));
}

// --- connection gate (plan: gate on the room actually being connected) ---
function drawConnectionStatus() {
  if (window.shareConnected && !window.shareError) return; // in the room: quiet

  push();
  textAlign(CENTER, CENTER);
  textSize(15);
  const msg = window.shareError
    ? 'Share error: ' + window.shareError
    : typeof shareStatusText === 'function'
      ? shareStatusText()
      : 'Not connected';
  const w = textWidth(msg) + 32;
  fill(255);
  stroke(0, 160);
  strokeWeight(1);
  rectMode(CENTER);
  rect(width / 2, height - 64, w, 34, 8);
  noStroke();
  fill(0);
  text(msg, width / 2, height - 64);
  pop();
}

// --- top bar (Step 9): badge ①/② + four pair-slots ---
// Slot k = pair k+1 (concept reference): empty, a faint inset when your
// partner found their half, solid when you found yours. The inset is drawn
// on top of the solid (as a white wash) so both states stay visible.
function drawTopBar() {
  if (myRole === 0) return;
  const st = window.shared;
  const barH = 76;

  push();

  // white strip with a black rule under it
  noStroke();
  fill(255);
  rect(0, 0, width, barH);
  stroke(0);
  strokeWeight(3);
  line(0, barH, width, barH);

  // badge, moved in from the corner
  const bx = 44;
  const by = barH / 2;
  const bd = 44;
  fill(255);
  stroke(0);
  strokeWeight(3);
  circle(bx, by, bd);
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  textStyle(BOLD);
  text(String(myRole), bx, by + 1);

  // four pair-slots, centred in the space right of the badge
  const slotW = 46;
  const slotH = 30;
  const gap = 14;
  const rowW = 4 * slotW + 3 * gap;
  const spaceL = bx + bd / 2 + 16;
  const spaceR = width - 16;
  const startX = spaceL + Math.max(0, (spaceR - spaceL - rowW) / 2);
  const sy = by - slotH / 2;
  const ownArr = st ? (myRole === 2 ? st.p2Found : st.p1Found) : null;
  const partnerArr = st ? (myRole === 2 ? st.p1Found : st.p2Found) : null;

  for (let k = 0; k < 4; k++) {
    const sx = startX + k * (slotW + gap);
    const col = PAIR_COLORS[k];
    const own = !!(ownArr && ownArr[k]);
    const partner = !!(partnerArr && partnerArr[k]);

    // empty slot
    fill(255);
    stroke(0);
    strokeWeight(3);
    rect(sx, sy, slotW, slotH);

    // solid: you found your half
    if (own) {
      fill(col[0], col[1], col[2]);
      rect(sx, sy, slotW, slotH);
    }

    // faint inset: your partner found theirs
    if (partner) {
      noStroke();
      if (own) {
        fill(255, 255, 255, 160); // wash over the solid
      } else {
        fill(col[0], col[1], col[2], 70); // faint tint on white
      }
      rect(sx + slotW * 0.2, sy + slotH * 0.25, slotW * 0.6, slotH * 0.5);
    }
  }

  textStyle(NORMAL);
  pop();
}

// --- invite line: room + join link until a partner is in ---
function drawInvite() {
  const alone = !(window.shareConnected && !window.shareError && myRole > 0 && livePeers.size > 0);
  if (!alone) return;

  push();
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  noStroke();
  const room = window.shareRoom || 'a1-iris';
  fill(0);
  textSize(15);
  text('Waiting for a partner — room ' + room, width / 2, height - 84);
  const url = typeof getShareJoinUrl === 'function' ? getShareJoinUrl() : '';
  let s = 12;
  textSize(s);
  while (textWidth(url) > width - 28 && s > 7) {
    s--;
    textSize(s);
  }
  fill(0, 130);
  text(url, width / 2, height - 58);
  pop();
}

// --- partner presence ---
// guests (quiet mode) are snapshots that go stale, so: seed at welcome from
// phones that report a role (i.e. running this build), then trust live
// join/leave events — those are never suppressed by quiet.
function shareReady() {
  for (const g of guestsWith('role')) livePeers.add(g.id);
}

function shareJoined(id) {
  livePeers.add(id);
}

function shareLeft(id) {
  livePeers.delete(id);
}

// --- pointer input: p5.js 2's unified callbacks ---
// touchStarted/Moved/Ended are no-ops in p5.js 2 and would silently do nothing.
function mousePressed() {
  pressX = mouseX;
  pressY = mouseY;
  downX = mouseX;
  downY = mouseY;
  return false;
}

function mouseDragged() {
  camX -= mouseX - pressX;
  camY -= mouseY - pressY;
  pressX = mouseX;
  pressY = mouseY;
  return false;
}

function mouseReleased() {
  // tap vs drag (Step 10): compare press with release — under 10 px is a
  // tap, more is a drag, and a drag must never claim.
  const moved = Math.hypot(mouseX - downX, mouseY - downY);
  if (moved < 10) tryClaim(mouseX, mouseY);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
