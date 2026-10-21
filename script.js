const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const W = canvas.width;
const H = canvas.height;

let score = 0;
let level = loadLevel();
let arrows = 10;
let running = false;
let soundOn = true;
let arrow = null;
let particles = [];

let aim = { x: 650, y: 250 };
let audio = null;
let targetY = 260;
let targetDir = 1;
let timeLeft = 60;
let timerId = null;
let countdownActive = false;
let countdownValue = 3;
let dragging = false;
let lastX = 0;
let lastY = 0;
const PREVIEW_STEPS = 40;

function loadLevel() {
  try {
    const n = parseInt(localStorage.getItem("archeryLevel"), 10);
    return n > 0 ? n : 1;
  } catch (e) {
    return 1;
  }
}

function saveLevel() {
  try {
    localStorage.setItem("archeryLevel", level);
  } catch (e) {}
}

function goal() {
  return 150 + level * 50;
}

function roundTime() {
  return Math.max(30, 60 - (level - 1) * 2);
}

function target() {
  const distance = 1 + Math.floor((level - 1) / 2);

  return {
    x: W - 130 - Math.min(distance - 1, 6) * 17,
    y: targetY,
    r: Math.max(23, 43 - distance * 2),
    distance
  };
}

function beep(freq = 440) {
  if (!soundOn) return;

  try {
    audio ||= new (window.AudioContext ||
      window.webkitAudioContext)();

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.05;

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start();
    osc.stop(audio.currentTime + 0.12);
  } catch (e) {}
}

function updateHUD() {
  $("score").textContent =
    String(score).padStart(4, "0") + "/" + String(goal()).padStart(4, "0");
  $("level").textContent = String(level).padStart(2, "0");
  $("arrows").textContent = arrows;
  $("distance").textContent = target().distance + "x";
  $("time").textContent = timeLeft;
}

function message(text) {
  $("message").textContent = text;
}

function background() {
  ctx.fillStyle = "#91d9d0";
  ctx.fillRect(0, 0, W, H);

  // Retro sunset
  ctx.fillStyle = "#f9d98a";
  ctx.fillRect(0, 40, W, 260);

  ctx.fillStyle = "#ffad76";
  ctx.fillRect(0, 150, W, 120);

  ctx.fillStyle = "#fff0b3";
  ctx.fillRect(710, 70, 65, 65);

  // Mountains
  ctx.fillStyle = "#719eaa";
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(150, 190);
  ctx.lineTo(290, 320);
  ctx.lineTo(450, 220);
  ctx.lineTo(600, 320);
  ctx.lineTo(780, 200);
  ctx.lineTo(960, 320);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.fill();

  // Ground
  ctx.fillStyle = "#43856d";
  ctx.fillRect(0, 355, W, 185);

  ctx.fillStyle = "#326b5a";
  ctx.fillRect(0, 410, W, 130);

  // Shooting platform
  ctx.fillStyle = "#76513c";
  ctx.fillRect(50, 405, 260, 18);
}

function archer() {
  const x = 150;
  const y = 345;

  // Head
  ctx.fillStyle = "#e7a16e";
  ctx.fillRect(x - 8, y - 60, 20, 22);

  // Hair
  ctx.fillStyle = "#342b45";
  ctx.fillRect(x - 12, y - 68, 28, 10);

  // Eye
  ctx.fillRect(x + 5, y - 53, 5, 4);

  // Shirt
  ctx.fillStyle = "#f1c45e";
  ctx.fillRect(x - 17, y - 36, 35, 36);

  // Belt
  ctx.fillStyle = "#c56a50";
  ctx.fillRect(x - 17, y - 16, 35, 6);

  // Legs
  ctx.fillStyle = "#342b45";
  ctx.fillRect(x - 13, y, 10, 25);
  ctx.fillRect(x + 4, y, 10, 25);

  // Arm
  ctx.fillStyle = "#e7a16e";
  ctx.fillRect(x + 12, y - 29, 20, 6);

  // Bow
  ctx.strokeStyle = "#54362c";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + 34, y - 30, 25, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.strokeStyle = "#fff4d6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 34, y - 55);
  ctx.lineTo(x + 34, y - 5);
  ctx.stroke();
}

function drawTarget() {
  const t = target();

  // Stand
  ctx.fillStyle = "#67432f";
  ctx.fillRect(t.x - 4, t.y + 5, 8, 410 - t.y);

  ctx.fillStyle = "#b88954";
  ctx.fillRect(t.x - 25, 415, 50, 9);

  const rings = [
    [1, "#fff1c9"],
    [0.78, "#d94d54"],
    [0.56, "#fff1c9"],
    [0.34, "#d94d54"],
    [0.15, "#f5cb58"]
  ];

  for (const [scale, color] of rings) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#172238";
  ctx.font = "22px monospace";
  ctx.textAlign = "center";
  ctx.fillText("DISTANCE " + t.distance, t.x, t.y + t.r + 30);
}

function drawArrow(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = "#3b2c35";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-25, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();

  // Arrowhead
  ctx.fillStyle = "#f9d98a";
  ctx.beginPath();
  ctx.moveTo(27, 0);
  ctx.lineTo(14, -6);
  ctx.lineTo(14, 6);
  ctx.fill();

  // Fletching
  ctx.fillStyle = "#ff6f91";
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-30, -7);
  ctx.lineTo(-28, 0);
  ctx.lineTo(-30, 7);
  ctx.fill();

  ctx.restore();
}

function drawAim() {
  if (!running || arrow) return;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);

  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
}

function burst(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 30
    });
  }
}

function updateTarget() {
  if (!running) return;

  targetY += (1 + level * 0.4) * targetDir;

  if (targetY > 300) {
    targetY = 300;
    targetDir = -1;
  }

  if (targetY < 110) {
    targetY = 110;
    targetDir = 1;
  }
}

function drawTrajectory() {
  if (!running || arrow) return;

  const angle = Math.atan2(aim.y - 315, aim.x - 190);
  let x = 190;
  let y = 315;
  let vx = Math.cos(angle) * 13;
  let vy = Math.sin(angle) * 13;

  for (let i = 0; i < PREVIEW_STEPS; i++) {
    x += vx;
    y += vy;
    vy += 0.11;

    if (x > W || y > H || y < 0) break;

    if (i % 3 === 0) {
      ctx.globalAlpha = 1 - i / PREVIEW_STEPS;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  ctx.globalAlpha = 1;
}

function drawCountdown() {
  if (!countdownActive) return;

  ctx.fillStyle = "#111a2c99";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ff8b45";
  ctx.font = "96px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(countdownValue, W / 2, H / 2);
  ctx.textBaseline = "alphabetic";
}

function endRound(title, text, button) {
  running = false;
  arrow = null;
  clearInterval(timerId);

  $("overlayTitle").textContent = title;
  $("overlayText").textContent = text;
  $("startBtn").textContent = button;
  $("overlay").classList.remove("hidden");
}

function failRound(title) {
  endRound(
    title,
    "Score " + score + "/" + goal() + " - retry level " + level,
    "↻ RETRY LEVEL"
  );
}

function clearLevel() {
  const earned = score;

  level++;
  saveLevel();
  score = 0;
  beep(1000);
  updateHUD();

  endRound(
    "LEVEL CLEARED!",
    "Score " + earned + " - next goal " + goal() + " points",
    "▶ NEXT LEVEL"
  );
}

function startTimer() {
  clearInterval(timerId);

  timerId = setInterval(() => {
    if (!running) return;

    timeLeft--;
    updateHUD();

    if (timeLeft <= 0) failRound("TIME UP!");
  }, 1000);
}

function beginCountdown() {
  countdownActive = true;
  countdownValue = 3;
  beep(500);

  const step = setInterval(() => {
    countdownValue--;

    if (countdownValue > 0) {
      beep(500);
      return;
    }

    clearInterval(step);
    countdownActive = false;
    running = true;
    beep(900);
    message("Aim carefully and shoot!");
    startTimer();
  }, 1000);
}

function shoot() {
  if (!running || arrow || arrows <= 0) return;

  arrows--;

  const startX = 190;
  const startY = 315;
  const dx = aim.x - startX;
  const dy = aim.y - startY;
  const angle = Math.atan2(dy, dx);

  arrow = {
    x: startX,
    y: startY,
    vx: Math.cos(angle) * 13,
    vy: Math.sin(angle) * 13,
    angle,
    age: 0
  };

  updateHUD();
  beep(260);
}

function finishShot(hit, x, y) {
  let cleared = false;

  if (hit) {
    const t = target();
    const d = Math.hypot(x - t.x, y - t.y);

    let points = d < t.r * 0.2 ? 100 : d < t.r * 0.45 ? 60 : 30;
    points *= t.distance;

    score += points;
    burst(x, y);
    message("HIT! +" + points);
    beep(800);

    if (score >= goal()) cleared = true;
  } else {
    message("MISSED! Try again.");
    beep(150);
  }

  arrow = null;
  updateHUD();

  if (cleared) clearLevel();
  else if (arrows <= 0) failRound("ROUND OVER!");
}

function updateArrow() {
  if (!arrow) return;

  arrow.x += arrow.vx;
  arrow.y += arrow.vy;

  // Gravity creates an arc
  arrow.vy += 0.11;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
  arrow.age++;

  const t = target();

  if (Math.hypot(arrow.x - t.x, arrow.y - t.y) < t.r * 0.92) {
    finishShot(true, arrow.x, arrow.y);
  } else if (
    arrow.x > W + 30 ||
    arrow.y > H + 30 ||
    arrow.y < -30 ||
    arrow.age > 100
  ) {
    finishShot(false, arrow.x, arrow.y);
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
  }

  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = "#f5cb58";
    ctx.fillRect(p.x, p.y, 5, 5);
  }

  ctx.globalAlpha = 1;
}

function loop() {
  updateArrow();
  updateTarget();
  updateParticles();

  background();
  archer();
  drawTarget();

  if (arrow) {
    drawArrow(arrow.x, arrow.y, arrow.angle);
  }

  drawTrajectory();
  drawAim();
  drawParticles();
  drawCountdown();

  requestAnimationFrame(loop);
}

function clampAim() {
  aim.x = Math.max(190, Math.min(W - 20, aim.x));
  aim.y = Math.max(50, Math.min(420, aim.y));
}

function updateAim(event) {
  const rect = canvas.getBoundingClientRect();

  aim.x = (event.clientX - rect.left) * W / rect.width;
  aim.y = (event.clientY - rect.top) * H / rect.height;

  clampAim();
}

function dragAim(event) {
  const rect = canvas.getBoundingClientRect();

  aim.x += (event.clientX - lastX) * W / rect.width;
  aim.y += (event.clientY - lastY) * H / rect.height;
  lastX = event.clientX;
  lastY = event.clientY;

  clampAim();
}

canvas.addEventListener("pointermove", event => {
  if (event.pointerType === "mouse") updateAim(event);
  else if (dragging) dragAim(event);
});

canvas.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse") {
    updateAim(event);
    if (running) shoot();
    return;
  }

  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointerup", event => {
  if (event.pointerType === "mouse" || !dragging) return;

  dragging = false;
  if (running) shoot();
});

canvas.addEventListener("pointercancel", () => {
  dragging = false;
});

window.addEventListener("keydown", event => {
  if (event.code === "Space") {
    event.preventDefault();
    if (running) shoot();
  }
});

function startGame() {
  if (countdownActive) return;

  score = 0;
  arrows = 10;
  arrow = null;
  particles = [];
  targetY = 260;
  targetDir = 1;
  timeLeft = roundTime();

  updateHUD();
  $("overlay").classList.add("hidden");
  beginCountdown();
}

$("startBtn").addEventListener("click", startGame);

$("soundBtn").addEventListener("click", () => {
  soundOn = !soundOn;
  $("soundBtn").textContent = soundOn ? "🔊 SOUND ON" : "🔇 SOUND OFF";
  if (soundOn) beep(500);
});

const gameEl = document.querySelector(".game");

function isNativeFull() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function setFull(on) {
  gameEl.classList.toggle("full", on);
  $("fullBtn").textContent = on ? "✕ EXIT FULLSCREEN" : "⛶ FULLSCREEN";
}

function toggleFull() {
  if (isNativeFull()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }

  if (gameEl.classList.contains("full")) {
    setFull(false);
    return;
  }

  const request = gameEl.requestFullscreen || gameEl.webkitRequestFullscreen;

  setFull(true);

  if (request) {
    const result = request.call(gameEl);
    if (result && result.catch) result.catch(() => {});
  }
}

function syncFull() {
  if (!isNativeFull()) setFull(false);
}

$("fullBtn").addEventListener("click", toggleFull);
document.addEventListener("fullscreenchange", syncFull);
document.addEventListener("webkitfullscreenchange", syncFull);

$("overlayText").textContent = "Level " + level + " - goal " + goal() + " points";
$("startBtn").textContent = "▶ START LEVEL " + level;

updateHUD();
loop();