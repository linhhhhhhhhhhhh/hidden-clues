// Hidden Clues — Step 2: panning a 3×3-screen world
// p5.js 2.3.2 + p5-phone 1.16.1

let camX = 0; // camera: world coords of the view's top-left
let camY = 0;
let pressX = 0; // pointer position at press, for drag deltas
let pressY = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
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
