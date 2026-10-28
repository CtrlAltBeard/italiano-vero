/* =========================================================
   ITALIANO VERO — v0.4 (modular)
   index.html = markup · css/styles.css = design
   data/manifest.json + data/<category>.json = vocabulary (edit THESE, not the code)
   js/app.js = you are here.

   NOTE: data is fetched at runtime, which means browsers will
   block it on file:// . Test locally with:
       python3 -m http.server 8000
   then open http://localhost:8000
   ========================================================= */

/* ============ Helpers ============ */
const $ = (sel) => document.querySelector(sel);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
/* localStorage can throw in sandboxed/private contexts — never trust it */
const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
};
const catById = (id) => CATEGORIES.find((c) => c.id === id);
const vocabOf = (catId) => applyLevel(catId === "all" ? VOCAB : VOCAB.filter((v) => v.cat === catId));

/* ============ State ============ */
let CATEGORIES = [];  /* filled by boot() from data/vocab.json */
let VOCAB = [];       /* same */
let mastered = new Set();
try { mastered = new Set(JSON.parse(store.get("iv_mastered") || "[]")); } catch (e) {}
let mode = "flash";
let deck = { items: [], idx: 0, catId: null, hideMastered: false };
let quiz = null;

/* "Tutto" is synthesized, not stored — it's just "every entry" */
const ALL_CAT = { id: "all", emoji: "🌍", name: "Tutto", desc: "Everything, shuffled. The full meal deal", level: "A1–B1" };

/* ============ Data loading ============ */
/* data/manifest.json lists the category files; each file carries its own
   metadata + vocabulary. Adding a category = new JSON file + one manifest
   line. The manifest's order is the home grid's order. */
async function loadData() {
  const mres = await fetch("data/manifest.json");
  if (!mres.ok) throw new Error("HTTP " + mres.status + " fetching data/manifest.json");
  const manifest = await mres.json();
  if (!Array.isArray(manifest) || !manifest.length) throw new Error("data/manifest.json is empty or malformed");
  const files = await Promise.all(manifest.map(async (file) => {
    const res = await fetch("data/" + file);
    if (!res.ok) throw new Error("HTTP " + res.status + " fetching data/" + file);
    return await res.json();
  }));
  /* metadata for the home grid; "cat" is assigned from the file, not typed by hand */
  CATEGORIES = files.map(({ vocabulary, ...meta }) => meta).concat([ALL_CAT]);
  VOCAB = files.flatMap((c) => c.vocabulary.map((v) => ({ ...v, cat: c.id })));
}

function showLoadError(err) {
  const grid = $("#catGrid");
  const isFile = window.location.protocol === "file:";
  grid.innerHTML =
    '<div class="load-error">' +
    "<h3>Mamma mia — no data! 🍝</h3>" +
    "<p>Couldn't load the data files (" + err.message + ").</p>" +
    (isFile
      ? "<p style='margin-top:10px'>You opened the page directly from disk (<code>file://</code>), and browsers block <code>fetch()</code> there. Run a tiny local server instead:<br><code>python3 -m http.server 8000</code><br>then open <code>http://localhost:8000</code></p>"
      : "<p style='margin-top:10px'>Check that <code>data/manifest.json</code> and its category files exist and have no JSON errors — one stray comma kills the whole file. Try a hard refresh (Ctrl+Shift+R).</p>") +
    "</div>";
}

/* ============ Theme ============ */
const themeBtn = $("#themeBtn");
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  themeBtn.textContent = t === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
}
applyTheme(store.get("iv_theme") || "light");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  store.set("iv_theme", next);
});

/* ============ View switching ============ */
function show(viewId) {
  ["view-home", "view-deck", "view-quiz"].forEach((id) => {
    $("#" + id).hidden = id !== viewId;
  });
}

/* ============ Home ============ */
function renderHome() {
  const grid = $("#catGrid");
  grid.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const items = vocabOf(cat.id);
    const done = items.filter((v) => mastered.has(v.id)).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const btn = document.createElement("button");
    btn.className = "cat-card";
    btn.type = "button";
    btn.innerHTML =
      '<span class="cat-emoji">' + cat.emoji + "</span>" +
      '<div class="cat-name"></div>' +
      '<div class="cat-desc"></div>' +
      '<div class="cat-meta"><span class="chip"></span><span class="cat-count"></span></div>' +
      '<div class="cat-progress"><span style="width:' + pct + '%"></span></div>';
    btn.querySelector(".cat-name").textContent = cat.name;
    btn.querySelector(".cat-desc").textContent = cat.desc;
    btn.querySelector(".chip").textContent = cat.level;
    btn.querySelector(".cat-count").textContent = levelFilter === "all"
      ? done + " / " + items.length + " mastered"
      : items.length + (items.length === 1 ? " card" : " cards") + " at " + levelFilter;
    btn.addEventListener("click", () => (mode === "flash" ? startDeck(cat.id) : startQuiz(cat.id)));
    grid.appendChild(btn);
  });
  show("view-home");
}

/* ============ Mode toggle ============ */
function setMode(m) {
  mode = m;
  $("#modeFlash").classList.toggle("active", m === "flash");
  $("#modeQuiz").classList.toggle("active", m === "quiz");
  $("#quizLenWrap").hidden = m !== "quiz";
}
$("#modeFlash").addEventListener("click", () => setMode("flash"));
$("#modeQuiz").addEventListener("click", () => setMode("quiz"));

/* ============ Level & quiz-length filters ============ */
/* Data-driven: new levels appear as chips automatically as the data grows */
let levelFilter = "all";
let quizLen = 10;
const QUIZ_LENS = [10, 20, 50, 100];

function availableLevels() {
  return [...new Set(VOCAB.map((v) => v.level))].sort();
}
function renderLevelFilter() {
  const seg = $("#levelSeg");
  seg.innerHTML = "";
  ["all", ...availableLevels()].forEach((lv) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = lv === "all" ? "Tutti" : lv;
    b.classList.toggle("active", levelFilter === lv);
    b.addEventListener("click", () => { levelFilter = lv; renderLevelFilter(); });
    seg.appendChild(b);
  });
}
function renderQuizLenFilter() {
  const seg = $("#quizLenSeg");
  seg.innerHTML = "";
  QUIZ_LENS.forEach((n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = n;
    b.classList.toggle("active", quizLen === n);
    b.addEventListener("click", () => { quizLen = n; renderQuizLenFilter(); });
    seg.appendChild(b);
  });
}
function applyLevel(items) {
  return levelFilter === "all" ? items : items.filter((v) => v.level === levelFilter);
}

/* ============ Flashcards ============ */
function startDeck(catId) {
  deck = { items: shuffle(vocabOf(catId)), idx: 0, catId, hideMastered: deck.hideMastered };
  $("#deckTitle").textContent = catById(catId).name + " — Flashcards";
  $("#hideMastered").checked = deck.hideMastered;
  renderCard();
  show("view-deck");
}

function visibleDeck() {
  return deck.hideMastered ? deck.items.filter((v) => !mastered.has(v.id)) : deck.items;
}

function renderCard() {
  const cards = visibleDeck();
  const card = $("#flashcard");
  card.classList.remove("flipped");
  if (!cards.length) {
    const allDone = deck.items.length > 0;
    $("#cardFront").textContent = allDone
      ? "You've mastered everything in this deck! 🎉"
      : "No cards at this level 🤷";
    $("#cardBack").textContent = allDone
      ? "Torna per rivedere — repetition is the mother of skill. And of Italian."
      : "Try another level, or switch category. The vocabulary is out there.";
    $("#cardExample").textContent = "";
    $("#cardTip").textContent = "";
    $("#deckCounter").textContent = allDone
      ? "Deck complete — " + deck.items.length + " cards, all mastered."
      : "0 cards match this level filter.";
    $("#deckProgress").style.width = allDone ? "100%" : "0%";
    $("#btnMastered").disabled = true;
    $("#btnReview").disabled = true;
    return;
  }
  /* keep index in bounds after filtering */
  if (deck.idx >= cards.length) deck.idx = 0;
  const item = cards[deck.idx];
  $("#cardFront").textContent = item.it;
  $("#cardBack").textContent = item.en;
  $("#cardExample").innerHTML = item.ex
    ? "“" + item.ex + "”<span class='en'>“" + item.exEn + "”</span>"
    : "";
  $("#cardTip").innerHTML = item.note ? "<b>Native tip:</b> " + item.note : "";
  $("#deckCounter").textContent = "Card " + (deck.idx + 1) + " / " + cards.length;
  const done = deck.items.filter((v) => mastered.has(v.id)).length;
  $("#deckProgress").style.width = Math.round((done / deck.items.length) * 100) + "%";
  $("#btnMastered").disabled = false;
  $("#btnReview").disabled = false;
}

function flipCard() { $("#flashcard").classList.toggle("flipped"); }
function step(delta) {
  const cards = visibleDeck();
  if (!cards.length) return;
  deck.idx = (deck.idx + delta + cards.length) % cards.length;
  renderCard();
}
$("#flashcard").addEventListener("click", flipCard);
$("#flashcard").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipCard(); }
});
$("#btnPrev").addEventListener("click", () => step(-1));
$("#btnNext").addEventListener("click", () => step(1));
$("#btnMastered").addEventListener("click", () => {
  const cards = visibleDeck();
  const item = cards[deck.idx];
  if (!item) return;
  mastered.add(item.id);
  store.set("iv_mastered", JSON.stringify([...mastered]));
  step(1);
});
$("#btnReview").addEventListener("click", () => step(1));
$("#hideMastered").addEventListener("change", (e) => {
  deck.hideMastered = e.target.checked;
  deck.idx = 0;
  renderCard();
});
$("#deckHome").addEventListener("click", renderHome);

/* ============ Quiz ============ */
const PRAISE = ["Bravissimo! 🤌", "Perfetto!", "Esatto!", "Niente male!", "Sì, proprio così!"];
const TEASE = ["Dai... no.", "Oof. Riprova con quella.", "Almost — but Italian says otherwise.", "Nope, but points for confidence."];

function startQuiz(catId) {
  const pool = vocabOf(catId);
  if (!pool.length) {
    quiz = null;
    $("#quizTitle").textContent = catById(catId).name + " — Quiz";
    $("#quizProgress").style.width = "0%";
    $("#quizPanel").innerHTML =
      '<div class="results">' +
      '<div class="verdict">No cards at this level 🤷</div>' +
      '<div class="note">Try another level, or pick a different category.</div>' +
      '<div class="btn-row"><button class="btn" id="quizBackEmpty">← Categories</button></div>' +
      "</div>";
    $("#quizBackEmpty").addEventListener("click", renderHome);
    show("view-quiz");
    return;
  }
  const picks = shuffle(pool).slice(0, Math.min(quizLen, pool.length));
  const questions = picks.map((item) => {
    const direction = Math.random() < 0.5 ? "it2en" : "en2it";
    const sameCat = shuffle(pool.filter((v) => v.id !== item.id)).slice(0, 3);
    if (sameCat.length < 3) {
      const extra = shuffle(VOCAB.filter((v) => v.id !== item.id && !sameCat.some((s) => s.id === v.id)));
      sameCat.push(...extra.slice(0, 3 - sameCat.length));
    }
    return { item, direction, options: shuffle([item, ...sameCat]) };
  });
  quiz = { catId, questions, idx: 0, score: 0, locked: false };
  $("#quizTitle").textContent = catById(catId).name + " — Quiz";
  renderQuestion();
  show("view-quiz");
}

function renderQuestion() {
  const q = quiz.questions[quiz.idx];
  quiz.locked = false;
  const ask = q.direction === "it2en" ? q.item.it : q.item.en;
  const dirLabel = q.direction === "it2en" ? "What does this mean?" : "How do you say this in Italian?";
  const panel = $("#quizPanel");
  panel.innerHTML =
    '<div class="quiz-question-tag">' + dirLabel + " · " + (quiz.idx + 1) + " / " + quiz.questions.length + "</div>" +
    '<div class="quiz-question"></div>' +
    '<div class="options"></div>' +
    '<div class="quiz-feedback" id="quizFeedback">No pressure. Well, some. 🇮🇹</div>' +
    '<div class="quiz-next" id="quizNext"></div>';
  panel.querySelector(".quiz-question").textContent = ask;
  const optsEl = panel.querySelector(".options");
  q.options.forEach((opt, i) => {
    const b = document.createElement("button");
    b.className = "option";
    b.type = "button";
    b.textContent = (q.direction === "it2en" ? opt.en : opt.it);
    b.addEventListener("click", (e) => { e.stopPropagation(); answer(i, b); });
    optsEl.appendChild(b);
  });
  /* after answering, click anywhere on the panel to move on */
  panel.addEventListener("click", () => { if (quiz && quiz.locked) advance(); });
  $("#quizProgress").style.width = ((quiz.idx) / quiz.questions.length) * 100 + "%";
}

function answer(i, btn) {
  if (quiz.locked) return;
  quiz.locked = true;
  const q = quiz.questions[quiz.idx];
  const correct = q.options[i].id === q.item.id;
  const buttons = [...document.querySelectorAll(".option")];
  buttons.forEach((b, j) => {
    b.disabled = true;
    if (q.options[j].id === q.item.id) b.classList.add("correct");
  });
  const msg = correct
    ? PRAISE[Math.floor(Math.random() * PRAISE.length)]
    : TEASE[Math.floor(Math.random() * TEASE.length)];
  if (correct) {
    quiz.score++;
    btn.classList.add("correct");
  } else {
    btn.classList.add("wrong");
  }
  const fb = $("#quizFeedback");
  /* feedback + native tip stay on screen until the learner moves on */
  fb.innerHTML = msg + (q.item.note ? "<br><b>Native tip:</b> " + q.item.note : "");
  const last = quiz.idx + 1 >= quiz.questions.length;
  const next = $("#quizNext");
  const b = document.createElement("button");
  b.className = "btn primary";
  b.type = "button";
  b.textContent = last ? "Vedi risultati 🏁" : "Avanti →";
  next.appendChild(b);
}

/* click, Enter or Space all lead here — the timer no longer rushes anyone */
function advance() {
  if (!quiz || !quiz.locked) return; /* re-entry guard: panel click + button click both fire */
  quiz.locked = false;
  quiz.idx++;
  if (quiz.idx >= quiz.questions.length) renderResults();
  else renderQuestion();
}

function verdict(pct) {
  if (pct === 100) return "Perfetto. Assolutamente perfetto. You may now argue about coffee with strangers.";
  if (pct >= 80) return "Bravissimo! You're officially allowed to gesture with your hands while talking.";
  if (pct >= 60) return "Non male! Duolingo should be worried about you.";
  if (pct >= 40) return "Dai, you tried. Rome wasn't conjugated in a day.";
  return "Oof. Okay. Two espressos and we go again. Si riparte.";
}

function renderResults() {
  $("#quizProgress").style.width = "100%";
  const pct = Math.round((quiz.score / quiz.questions.length) * 100);
  const panel = $("#quizPanel");
  panel.innerHTML =
    '<div class="results">' +
    '<div class="score">' + quiz.score + " / " + quiz.questions.length + "</div>" +
    '<div class="verdict"></div>' +
    '<div class="note">' + pct + "% — questions are graded by an Italian, so mercy was never on the menu.</div>" +
    '<div class="btn-row">' +
    '<button class="btn primary" id="quizRetry">Riprova 🔁</button>' +
    '<button class="btn" id="quizBack">← Categories</button>' +
    "</div></div>";
  panel.querySelector(".verdict").textContent = verdict(pct);
  $("#quizRetry").addEventListener("click", () => startQuiz(quiz.catId));
  $("#quizBack").addEventListener("click", renderHome);
}
$("#quizHome").addEventListener("click", renderHome);

/* ============ Keyboard shortcuts ============ */
document.addEventListener("keydown", (e) => {
  if (!$("#view-deck").hidden) {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  }
  if (!$("#view-quiz").hidden && quiz) {
    if (quiz.locked && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); advance(); }
    if (!quiz.locked && ["1", "2", "3", "4"].includes(e.key)) {
      const opt = document.querySelectorAll(".option")[Number(e.key) - 1];
      if (opt) opt.click();
    }
  }
});

/* ============ Boot ============ */
(async function boot() {
  try {
    await loadData();
    renderLevelFilter();
    renderQuizLenFilter();
    renderHome();
  } catch (err) {
    showLoadError(err);
    show("view-home");
  }
})();