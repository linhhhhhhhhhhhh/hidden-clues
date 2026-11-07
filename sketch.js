// Hidden Clues — Step 5: roles + partner UI
// p5.js 2.3.2 + p5-phone 1.16.1

let camX = 0; // camera: world coords of the view's top-left
let camY = 0;
let pressX = 0; // pointer position at press, for drag deltas
let pressY = 0;

// --- roles (Step 5) ---
const ROLE_KEY = 'hidden-clues-role'; // sessionStorage: per tab/phone, survives reload
let myRole = 0; // 0 = not pinned yet, else 1 or 2
const livePeers = new Set(); // other phones we know to be in the room

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
  drawBadge();
  drawInvite();
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

// --- ①/② badge: circled number, top-left corner ---
function drawBadge() {
  if (myRole === 0) return;
  push();
  const bx = 46;
  const by = 46;
  const d = 44;
  fill(255);
  stroke(0);
  strokeWeight(3);
  circle(bx, by, d);
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  textStyle(BOLD);
  text(String(myRole), bx, by + 1);
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
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
