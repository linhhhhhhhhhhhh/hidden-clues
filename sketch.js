// Hidden Clues — Step 1: full-screen canvas + fixed scanner window
// p5.js 2.3.2 + p5-phone 1.16.1

async function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
}

function draw() {
  background(20); // dark background, matches the page

  // Fixed scanner window: square, 60% of screen width, centred
  const side = width * 0.6;
  const x = width / 2 - side / 2;
  const y = height / 2 - side / 2;

  // Thin border
  noFill();
  stroke(255, 255, 255, 50);
  strokeWeight(1);
  rect(x, y, side, side);

  // Faint crosshair at the centre
  stroke(255, 40);
  strokeWeight(1);
  const arm = 18;
  line(width / 2 - arm, height / 2, width / 2 + arm, height / 2);
  line(width / 2, height / 2 - arm, width / 2, height / 2 + arm);

  // Four corner brackets
  stroke(255, 160);
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
