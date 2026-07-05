/* ==========================================================
   ENGLISH QUEST — Lógica del juego
   ----------------------------------------------------------
   Qué hace este archivo:
   1. Deja elegir idioma (español/portugués) en la bienvenida
   2. Dibuja los destinos en la pantalla de inicio
   3. Maneja el flujo del quiz (pregunta → feedback → siguiente),
      con dificultad creciente dentro de cada partida
   4. Calcula XP y rachas (streaks)
   5. Guarda el progreso en localStorage (persiste al cerrar)
   6. Muestra el pasaporte con los sellos ganados
   ========================================================== */

// ---------- Banco de preguntas ----------
// Se carga en runtime desde data/questions.json en vez de venir hardcodeado,
// porque ese archivo se sincroniza periódicamente desde un repo privado
// (y eventualmente desde Make.com), así el contenido cambia sin tocar el código.
let DESTINATIONS = [];

// ---------- Idioma ----------
const LANG_KEY = "englishQuestLang";
let LANG = localStorage.getItem(LANG_KEY) || "es";

// Textos fijos de la interfaz por idioma. Los campos de contenido
// (nombre de destino, explicaciones, etc.) viven en data/questions.json
// como { es, pt } y se resuelven con pick().
const UI_STRINGS = {
  es: {
    eyebrow: "BOARDING PASS · TARJETA DE EMBARQUE",
    tagline: "Cada pregunta te acerca a un nuevo destino.<br/>Gana XP, mantén tu racha y llena tu pasaporte de sellos.",
    statXp: "XP total",
    statStamps: "Sellos",
    statStreak: "Mejor racha",
    chooseDestination: "Elige tu destino",
    btnPassport: "📖 Ver mi pasaporte",
    btnReset: "Reiniciar progreso",
    btnChangeLang: "🌐 Cambiar idioma",
    questionCounter: (i, n) => `Pregunta ${i} / ${n}`,
    feedbackCorrectStreak: (streak, xp) => `✅ ¡Correcto! Racha de ${streak} 🔥 (+${xp} XP)`,
    feedbackCorrect: (xp) => `✅ ¡Correcto! (+${xp} XP)`,
    feedbackWrong: "❌ Incorrecto",
    btnNext: "Siguiente →",
    resultsCorrectLabel: "Correctas",
    resultsXpLabel: "XP ganados",
    resultsStreakLabel: "Racha máx.",
    btnRetry: "↻ Repetir destino",
    btnHome: "Volver al mapa",
    stampApproved: "APPROVED",
    resultsTitleWin: (name) => `¡Sello de ${name} conseguido!`,
    resultsSubPerfect: "Perfecto. Ni la aduana te detiene. 🛂",
    resultsSubWin: "Destino completado. Tu pasaporte tiene un sello nuevo.",
    resultsTitleLose: "Casi lo logras...",
    resultsSubLose: (pct) => `Necesitas 70% para el sello. Conseguiste ${pct}%. ¡Inténtalo de nuevo!`,
    passportEyebrow: "PASSPORT · PASAPORTE",
    btnPassportBack: "← Volver",
    confirmReset: "¿Seguro? Se borrará todo tu XP y tus sellos.",
    loadError: "No se pudo cargar el banco de preguntas. Intenta recargar la página.",
    welcomeTitle: "Elige tu idioma",
    welcomeSubtitle: "¿En qué idioma quieres ver las explicaciones del juego?",
    langEs: "Español",
    langPt: "Português",
    btnContinue: "Continuar →",
  },
  pt: {
    eyebrow: "BOARDING PASS · CARTÃO DE EMBARQUE",
    tagline: "Cada pergunta te aproxima de um novo destino.<br/>Ganhe XP, mantenha sua sequência e encha seu passaporte de carimbos.",
    statXp: "XP total",
    statStamps: "Carimbos",
    statStreak: "Melhor sequência",
    chooseDestination: "Escolha seu destino",
    btnPassport: "📖 Ver meu passaporte",
    btnReset: "Reiniciar progresso",
    btnChangeLang: "🌐 Mudar idioma",
    questionCounter: (i, n) => `Pergunta ${i} / ${n}`,
    feedbackCorrectStreak: (streak, xp) => `✅ Correto! Sequência de ${streak} 🔥 (+${xp} XP)`,
    feedbackCorrect: (xp) => `✅ Correto! (+${xp} XP)`,
    feedbackWrong: "❌ Incorreto",
    btnNext: "Próxima →",
    resultsCorrectLabel: "Acertos",
    resultsXpLabel: "XP ganhos",
    resultsStreakLabel: "Sequência máx.",
    btnRetry: "↻ Repetir destino",
    btnHome: "Voltar ao mapa",
    stampApproved: "APPROVED",
    resultsTitleWin: (name) => `Carimbo de ${name} conquistado!`,
    resultsSubPerfect: "Perfeito. Nem a alfândega te detém. 🛂",
    resultsSubWin: "Destino concluído. Seu passaporte tem um carimbo novo.",
    resultsTitleLose: "Quase conseguiu...",
    resultsSubLose: (pct) => `Você precisa de 70% para o carimbo. Conseguiu ${pct}%. Tente de novo!`,
    passportEyebrow: "PASSPORT · PASSAPORTE",
    btnPassportBack: "← Voltar",
    confirmReset: "Tem certeza? Todo o seu XP e carimbos serão apagados.",
    loadError: "Não foi possível carregar o banco de perguntas. Tente recarregar a página.",
    welcomeTitle: "Escolha seu idioma",
    welcomeSubtitle: "Em qual idioma você quer ver as explicações do jogo?",
    langEs: "Español",
    langPt: "Português",
    btnContinue: "Continuar →",
  },
};

const t = (key, ...args) => {
  const entry = UI_STRINGS[LANG][key];
  return typeof entry === "function" ? entry(...args) : entry;
};

// Resuelve un campo bilingüe { es, pt } del banco de preguntas al idioma activo.
const pick = (field) => (field ? field[LANG] ?? field.es : "");

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
  welcome: $("screen-welcome"),
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

// ---------- Idioma: pantalla de bienvenida ----------
function applyStaticText() {
  $("ui-eyebrow").textContent = t("eyebrow");
  $("ui-tagline").innerHTML = t("tagline");
  $("ui-stat-xp-label").textContent = t("statXp");
  $("ui-stat-stamps-label").textContent = t("statStamps");
  $("ui-stat-streak-label").textContent = t("statStreak");
  $("ui-choose-dest").textContent = t("chooseDestination");
  $("btn-passport").textContent = t("btnPassport");
  $("btn-reset").textContent = t("btnReset");
  $("btn-change-lang").textContent = t("btnChangeLang");
  $("btn-next").textContent = t("btnNext");
  $("ui-results-correct-label").textContent = t("resultsCorrectLabel");
  $("ui-results-xp-label").textContent = t("resultsXpLabel");
  $("ui-results-streak-label").textContent = t("resultsStreakLabel");
  $("btn-retry").textContent = t("btnRetry");
  $("btn-home").textContent = t("btnHome");
  $("ui-passport-eyebrow").textContent = t("passportEyebrow");
  $("btn-passport-back").textContent = t("btnPassportBack");
  $("welcome-title").textContent = t("welcomeTitle");
  $("welcome-subtitle").textContent = t("welcomeSubtitle");
  $("lang-es").querySelector(".lang-name").textContent = t("langEs");
  $("lang-pt").querySelector(".lang-name").textContent = t("langPt");
  $("btn-welcome-continue").textContent = t("btnContinue");
  document.documentElement.lang = LANG === "pt" ? "pt-BR" : "es";
}

function renderWelcomeSelection() {
  $("lang-es").classList.toggle("selected", LANG === "es");
  $("lang-pt").classList.toggle("selected", LANG === "pt");
}

function selectLanguage(lang) {
  LANG = lang;
  localStorage.setItem(LANG_KEY, LANG);
  renderWelcomeSelection();
  applyStaticText();
  if (DESTINATIONS.length) renderHome();
}

$("lang-es").addEventListener("click", () => selectLanguage("es"));
$("lang-pt").addEventListener("click", () => selectLanguage("pt"));
$("btn-welcome-continue").addEventListener("click", () => { renderHome(); showScreen("home"); });
$("btn-change-lang").addEventListener("click", () => { renderWelcomeSelection(); showScreen("welcome"); });

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
        <span class="dest-name">${pick(dest.name)}</span>
        <span class="dest-level">${pick(dest.level)}</span>
        <span class="dest-desc">${pick(dest.desc)}</span>
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

// Agrupa las preguntas por su nivel de "difficulty" y las ordena de menor a
// mayor, barajando el orden dentro de cada nivel. Así cada partida escala en
// dificultad de principio a fin, pero nunca se repite igual entre intentos.
function orderByDifficulty(questions) {
  const tiers = new Map();
  questions.forEach((q) => {
    const level = q.difficulty || 1;
    if (!tiers.has(level)) tiers.set(level, []);
    tiers.get(level).push(q);
  });
  const sortedLevels = [...tiers.keys()].sort((a, b) => a - b);
  return sortedLevels.flatMap((level) => shuffleArray(tiers.get(level)));
}

// ---------- Iniciar partida ----------
function startGame(dest) {
  const escalated = orderByDifficulty(dest.questions).map(shuffleQuestionOptions);

  game = {
    dest,
    questions: escalated,
    index: 0,
    correct: 0,
    xpEarned: 0,
    streak: 0,
    maxStreak: 0,
  };

  $("game-destination").textContent = `${dest.flag} ${pick(dest.name)}`;
  showScreen("game");
  renderQuestion();
}

// ---------- Mostrar pregunta ----------
function renderQuestion() {
  const q = game.questions[game.index];

  $("game-counter").textContent = t("questionCounter", game.index + 1, game.questions.length);
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
      ? t("feedbackCorrectStreak", game.streak, 10 + bonus)
      : t("feedbackCorrect", 10 + bonus);
    $("feedback-title").className = "feedback-title ok";
  } else {
    game.streak = 0;
    btnClicked.classList.add("wrong");
    soundWrong();
    $("feedback-title").textContent = t("feedbackWrong");
    $("feedback-title").className = "feedback-title bad";
  }

  $("streak-num").textContent = game.streak;
  $("feedback-explanation").textContent = pick(q.explain);
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
    stampBox.innerHTML = `${game.dest.flag}<small>${t("stampApproved")}</small>`;
    $("results-title").textContent = t("resultsTitleWin", pick(game.dest.name));
    $("results-sub").textContent = pct === 1 ? t("resultsSubPerfect") : t("resultsSubWin");
    setTimeout(soundStamp, 300);
  } else {
    stampBox.style.display = "none";
    $("results-title").textContent = t("resultsTitleLose");
    $("results-sub").textContent = t("resultsSubLose", Math.round(pct * 100));
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
      ? `<span class="flag">${dest.flag}</span><span>${pick(dest.name).toUpperCase()}</span><span>${t("stampApproved")}</span>`
      : `<span class="flag">🔒</span><span>${pick(dest.name)}</span>`;
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
  if (confirm(t("confirmReset"))) {
    save = { xp: 0, bestStreak: 0, stamps: [] };
    persistSave();
    renderHome();
  }
});

// ---------- Arranque ----------
applyStaticText();
renderWelcomeSelection();

// cache: "no-store" evita que el navegador sirva una copia vieja de las
// preguntas cuando el JSON se actualiza en el servidor.
async function loadQuestions() {
  try {
    const res = await fetch("data/questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DESTINATIONS = await res.json();
  } catch (err) {
    $("destinations").innerHTML = `<p>${t("loadError")}</p>`;
    console.error("Error cargando data/questions.json:", err);
    return;
  }
  renderHome();
}

loadQuestions();
