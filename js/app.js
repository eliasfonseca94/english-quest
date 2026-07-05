/* ==========================================================
   ENGLISH QUEST — Lógica del juego
   ----------------------------------------------------------
   Qué hace este archivo:
   1. Dibuja los destinos en la pantalla de inicio
   2. Maneja el flujo del quiz (pregunta → feedback → siguiente)
   3. Calcula XP y rachas (streaks)
   4. Guarda el progreso en localStorage (persiste al cerrar)
   5. Muestra el pasaporte con los sellos ganados
   ========================================================== */

// ---------- Banco de preguntas ----------
// Se carga en runtime desde data/questions.json en vez de venir hardcodeado,
// porque ese archivo se sincroniza periódicamente desde un repo privado
// (y eventualmente desde Make.com), así el contenido cambia sin tocar el código.
let DESTINATIONS = [];

// ---------- Estado guardado (localStorage) ----------
const STORAGE_KEY = "englishQuestSave";

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { xp: 0, bestStreak: 0, stamps: [] };
  } catch {
    return { xp: 0, bestStreak: 0, stamps: [] };
  }
}

function persistSave() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

let save = loadSave();

// ---------- Estado de la partida actual ----------
let game = null; // se crea al elegir destino

// ---------- Atajos para el DOM ----------
const $ = (id) => document.getElementById(id);

const screens = {
  home: $("screen-home"),
  game: $("screen-game"),
  results: $("screen-results"),
  passport: $("screen-passport"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo(0, 0);
}

// ---------- Sonidos simples (Web Audio, sin archivos) ----------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(freq, duration = 0.12, type = "sine", volume = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

const soundCorrect = () => { beep(660, 0.1); setTimeout(() => beep(880, 0.15), 90); };
const soundWrong = () => beep(180, 0.25, "square", 0.08);
const soundStamp = () => { beep(440, 0.08); setTimeout(() => beep(550, 0.08), 80); setTimeout(() => beep(880, 0.2), 160); };

// ---------- Pantalla de inicio ----------
function renderHome() {
  $("home-xp").textContent = save.xp;
  $("home-stamps").textContent = save.stamps.length;
  $("home-best-streak").textContent = save.bestStreak;

  const container = $("destinations");
  container.innerHTML = "";

  DESTINATIONS.forEach((dest) => {
    const earned = save.stamps.includes(dest.id);
    const card = document.createElement("button");
    card.className = "dest-card";
    card.innerHTML = `
      <span class="dest-flag">${dest.flag}</span>
      <span class="dest-info">
        <span class="dest-name">${dest.name}</span>
        <span class="dest-level">${dest.level}</span>
        <span class="dest-desc">${dest.desc}</span>
      </span>
      <span class="dest-check">${earned ? "✔" : ""}</span>
    `;
    card.addEventListener("click", () => startGame(dest));
    container.appendChild(card);
  });
}

// ---------- Utilidades de mezcla ----------
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Devuelve una copia de la pregunta con las alternativas en orden aleatorio
// y el índice de la respuesta correcta recalculado.
function shuffleQuestionOptions(q) {
  const order = shuffleArray(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
  };
}

// ---------- Iniciar partida ----------
function startGame(dest) {
  // Barajamos el orden de las preguntas y, dentro de cada una, el de sus alternativas,
  // para que cada partida (incluso reiniciando) se vea distinta.
  const shuffled = shuffleArray(dest.questions).map(shuffleQuestionOptions);

  game = {
    dest,
    questions: shuffled,
    index: 0,
    correct: 0,
    xpEarned: 0,
    streak: 0,
    maxStreak: 0,
  };

  $("game-destination").textContent = `${dest.flag} ${dest.name}`;
  showScreen("game");
  renderQuestion();
}

// ---------- Mostrar pregunta ----------
function renderQuestion() {
  const q = game.questions[game.index];

  $("game-counter").textContent = `Pregunta ${game.index + 1} / ${game.questions.length}`;
  $("progress-fill").style.width = `${(game.index / game.questions.length) * 100}%`;
  $("streak-num").textContent = game.streak;
  $("question-type").textContent = q.type;
  $("question-text").textContent = q.q;
  $("feedback").classList.add("hidden");

  const optionsBox = $("options");
  optionsBox.innerHTML = "";

  q.options.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = text;
    btn.addEventListener("click", () => answer(i, btn));
    optionsBox.appendChild(btn);
  });
}

// ---------- Responder ----------
function answer(chosen, btnClicked) {
  const q = game.questions[game.index];
  const buttons = document.querySelectorAll(".option");
  buttons.forEach((b) => (b.disabled = true));

  const isCorrect = chosen === q.answer;
  buttons[q.answer].classList.add("correct");

  if (isCorrect) {
    game.correct++;
    game.streak++;
    game.maxStreak = Math.max(game.maxStreak, game.streak);

    // XP base 10, bonus por racha: +2 por cada acierto seguido (máx +10)
    const bonus = Math.min(game.streak - 1, 5) * 2;
    game.xpEarned += 10 + bonus;

    soundCorrect();
    $("streak-badge").classList.add("hot");
    setTimeout(() => $("streak-badge").classList.remove("hot"), 500);

    $("feedback-title").textContent = game.streak >= 3
      ? `✅ ¡Correcto! Racha de ${game.streak} 🔥 (+${10 + bonus} XP)`
      : `✅ ¡Correcto! (+${10 + bonus} XP)`;
    $("feedback-title").className = "feedback-title ok";
  } else {
    game.streak = 0;
    btnClicked.classList.add("wrong");
    soundWrong();
    $("feedback-title").textContent = "❌ Incorrecto";
    $("feedback-title").className = "feedback-title bad";
  }

  $("streak-num").textContent = game.streak;
  $("feedback-explanation").textContent = q.explain;
  $("feedback").classList.remove("hidden");
  $("btn-next").focus();
}

// ---------- Siguiente pregunta o resultados ----------
$("btn-next").addEventListener("click", () => {
  game.index++;
  if (game.index < game.questions.length) {
    renderQuestion();
  } else {
    finishGame();
  }
});

// ---------- Final de partida ----------
function finishGame() {
  const total = game.questions.length;
  const pct = game.correct / total;
  const earnedStamp = pct >= 0.7; // 70% o más = sello

  // Guardar progreso global
  save.xp += game.xpEarned;
  save.bestStreak = Math.max(save.bestStreak, game.maxStreak);
  if (earnedStamp && !save.stamps.includes(game.dest.id)) {
    save.stamps.push(game.dest.id);
  }
  persistSave();

  // Pintar resultados
  $("progress-fill").style.width = "100%";
  $("results-correct").textContent = `${game.correct}/${total}`;
  $("results-xp").textContent = `+${game.xpEarned}`;
  $("results-streak").textContent = game.maxStreak;

  const stampBox = $("stamp-reveal");
  if (earnedStamp) {
    stampBox.style.display = "flex";
    stampBox.innerHTML = `${game.dest.flag}<small>APPROVED</small>`;
    $("results-title").textContent = `¡Sello de ${game.dest.name} conseguido!`;
    $("results-sub").textContent = pct === 1
      ? "Perfecto. Ni la aduana te detiene. 🛂"
      : "Destino completado. Tu pasaporte tiene un sello nuevo.";
    setTimeout(soundStamp, 300);
  } else {
    stampBox.style.display = "none";
    $("results-title").textContent = "Casi lo logras...";
    $("results-sub").textContent = `Necesitas 70% para el sello. Conseguiste ${Math.round(pct * 100)}%. ¡Inténtalo de nuevo!`;
  }

  showScreen("results");
}

// ---------- Pasaporte ----------
function renderPassport() {
  const grid = $("passport-grid");
  grid.innerHTML = "";

  DESTINATIONS.forEach((dest) => {
    const earned = save.stamps.includes(dest.id);
    const slot = document.createElement("div");
    slot.className = "stamp-slot" + (earned ? " earned" : "");
    slot.innerHTML = earned
      ? `<span class="flag">${dest.flag}</span><span>${dest.name.toUpperCase()}</span><span>APPROVED</span>`
      : `<span class="flag">🔒</span><span>${dest.name}</span>`;
    grid.appendChild(slot);
  });
}

// ---------- Navegación ----------
$("btn-passport").addEventListener("click", () => { renderPassport(); showScreen("passport"); });
$("btn-passport-back").addEventListener("click", () => { renderHome(); showScreen("home"); });
$("btn-home").addEventListener("click", () => { renderHome(); showScreen("home"); });
$("btn-retry").addEventListener("click", () => startGame(game.dest));
$("btn-quit").addEventListener("click", () => { renderHome(); showScreen("home"); });

$("btn-reset").addEventListener("click", () => {
  if (confirm("¿Seguro? Se borrará todo tu XP y tus sellos.")) {
    save = { xp: 0, bestStreak: 0, stamps: [] };
    persistSave();
    renderHome();
  }
});

// ---------- Arranque ----------
// cache: "no-store" evita que el navegador sirva una copia vieja de las
// preguntas cuando el JSON se actualiza en el servidor.
async function loadQuestions() {
  try {
    const res = await fetch("data/questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DESTINATIONS = await res.json();
  } catch (err) {
    $("destinations").innerHTML =
      "<p>No se pudo cargar el banco de preguntas. Intenta recargar la página.</p>";
    console.error("Error cargando data/questions.json:", err);
    return;
  }
  renderHome();
}

loadQuestions();
