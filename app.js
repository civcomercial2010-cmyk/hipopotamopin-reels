// ─── Estado global ────────────────────────────────
let allScripts = [];   // [{id, data}]
let nextId = 1;

const STORAGE_KEY    = "hipopotamo_scripts";
const STORAGE_ID_KEY = "hipopotamo_next_id";

// ─── Persistencia localStorage ────────────────────
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY,    JSON.stringify(allScripts));
    localStorage.setItem(STORAGE_ID_KEY, String(nextId));
  } catch (_) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawId = localStorage.getItem(STORAGE_ID_KEY);
    if (raw) {
      allScripts = JSON.parse(raw);
      nextId = rawId ? parseInt(rawId, 10) : allScripts.length + 1;
    }
  } catch (_) {
    allScripts = [];
    nextId = 1;
  }
}

// ─── DOM ──────────────────────────────────────────
const generateBtn    = document.getElementById("generateBtn");
const regenerateBtn  = document.getElementById("regenerateBtn");
const wordBtn        = document.getElementById("wordBtn");
const clearBtn       = document.getElementById("clearBtn");
const loadingEl      = document.getElementById("loading");
const errorBox       = document.getElementById("errorBox");
const resultsActions = document.getElementById("resultsActions");
const resultsContainer = document.getElementById("resultsContainer");

// ─── Eventos principales ──────────────────────────
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => triggerGenerate(buildPrompt(btn.dataset.idea)));
});

generateBtn.addEventListener("click",   () => triggerGenerate(buildPrompt()));
regenerateBtn.addEventListener("click", () => triggerGenerate(buildPrompt()));
wordBtn.addEventListener("click",       () => downloadWord());
clearBtn.addEventListener("click",      () => clearAll());

// Delegación de eventos en tarjetas
resultsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const card = btn.closest("[data-script-id]");
  if (!card) return;
  const id = parseInt(card.dataset.scriptId, 10);
  const action = btn.dataset.action;
  if (action === "edit")   showEditMode(id);
  if (action === "delete") deleteCard(id);
  if (action === "save")   saveEdit(id);
  if (action === "cancel") cancelEdit(id);
});

// ─── Construcción del prompt ──────────────────────
function buildPrompt(quickIdea = null) {
  const tema     = quickIdea || document.getElementById("tema").value;
  const formato  = document.getElementById("formato").value;
  const objecion = document.getElementById("objecion").value;
  const incluir  = document.getElementById("incluir").value;

  let prompt = `Genera un guion completo de Reel para Hipopótamo sobre: ${tema}.`;
  if (formato)  prompt += `\nFormato del vídeo: ${formato}.`;
  if (objecion) prompt += `\nObjeción principal a abordar: ${objecion}.`;
  if (incluir)  prompt += `\nÉnfasis adicional: ${incluir}.`;
  prompt += `\nTermina el CTA con: "Hipopótamo, 8 centros muy cerca de ti." cuando encaje naturalmente.`;
  prompt += `\nIMPORTANTE: este guion debe tener un gancho, estructura y enfoque completamente diferente a cualquier otro.`;
  return prompt;
}

// ─── Llamada individual ───────────────────────────
async function callAPI(prompt) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt: prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Respuesta vacía");
  return JSON.parse(text);
}

// ─── Generar 3 guiones y acumular ────────────────
async function triggerGenerate(prompt) {
  setLoading(true);
  hideError();

  try {
    const results = await Promise.allSettled([
      callAPI(prompt), callAPI(prompt), callAPI(prompt),
    ]);

    const newBatch = results.map((r) =>
      r.status === "fulfilled"
        ? { id: nextId++, data: r.value, error: false }
        : { id: nextId++, data: null,    error: true  }
    );

    allScripts.push(...newBatch);
    saveToStorage();
    appendCards(newBatch);

    const validCount = allScripts.filter((s) => !s.error).length;
    if (validCount > 0) {
      resultsActions.classList.add("visible");
      updateWordBtn();
    }

    // Scroll al primer guion nuevo
    const firstNew = document.querySelector(`[data-script-id="${newBatch[0].id}"]`);
    if (firstNew) firstNew.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ─── Añadir tarjetas al DOM ───────────────────────
function appendCards(scripts) {
  scripts.forEach((s) => {
    const div = document.createElement("div");
    div.className = "result-card" + (s.error ? " result-card--error" : "");
    div.dataset.scriptId = s.id;
    div.innerHTML = s.error
      ? errorCardHTML(s.id)
      : cardContentHTML(s);
    resultsContainer.appendChild(div);
  });
  renumberCards();
}

// ─── Renumerar todas las tarjetas ─────────────────
function renumberCards() {
  const total = allScripts.length;
  allScripts.forEach((s, i) => {
    const card = document.querySelector(`[data-script-id="${s.id}"]`);
    if (!card) return;
    const numEl = card.querySelector(".card-number");
    if (numEl) numEl.innerHTML = `Guión ${i + 1} <span class="of-total">/ ${total}</span>`;
  });
}

// ─── HTML de tarjeta ──────────────────────────────
function cardContentHTML(s) {
  const d = s.data;
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const escenasHTML = (d.escenas || []).map((e, i) =>
    `<li><span>${i + 1}</span>${esc(e)}</li>`).join("");

  const textosHTML = (d.textos_pantalla || []).map((t) =>
    `<span class="chip">${esc(t)}</span>`).join("");

  const hashtagsHTML = (d.hashtags || []).map((h) =>
    `<span class="chip hashtag">${esc(h)}</span>`).join("");

  return `
    <div class="card-header">
      <div class="card-header-top">
        <div class="card-number">···</div>
        <div class="card-actions">
          <button class="btn-card-action btn-edit-card" data-action="edit">✎ Editar</button>
          <button class="btn-card-action btn-delete-card" data-action="delete">✕ Eliminar</button>
        </div>
      </div>
      <h3 class="card-title">${esc(d.titulo)}</h3>
      <span class="badge">${esc(d.objetivo)}</span>
    </div>

    <div class="section-card">
      <div class="section-label">🎯 Gancho (primeros 3 segundos)</div>
      <p class="gancho-text">${esc(d.gancho)}</p>
    </div>

    <div class="section-card">
      <div class="section-label">🎬 Guion completo</div>
      <p class="guion-text">${esc(d.guion).replace(/\n/g, "<br>")}</p>
    </div>

    <div class="section-card">
      <div class="section-label">🎥 Plan de grabación por escenas</div>
      <ol class="escenas-list">${escenasHTML}</ol>
    </div>

    <div class="section-card">
      <div class="section-label">💬 Textos en pantalla</div>
      <div class="chips">${textosHTML}</div>
    </div>

    <div class="section-card">
      <div class="section-label">📣 Call to action</div>
      <p class="cta-text">${esc(d.cta)}</p>
    </div>

    <div class="section-card">
      <div class="section-label">📱 Copy para Instagram</div>
      <p class="copy-instagram-text">${esc(d.copy_instagram).replace(/\n/g, "<br>")}</p>
    </div>

    <div class="section-card">
      <div class="section-label"># Hashtags</div>
      <div class="chips">${hashtagsHTML}</div>
    </div>`;
}

function errorCardHTML(id) {
  return `
    <div class="card-header">
      <div class="card-header-top">
        <div class="card-number">···</div>
        <div class="card-actions">
          <button class="btn-card-action btn-delete-card" data-action="delete">✕ Eliminar</button>
        </div>
      </div>
    </div>
    <div class="section-card">
      <p style="color:#c53030;">No se pudo generar este guion. Elimínalo y genera uno nuevo.</p>
    </div>`;
}

// ─── HTML del formulario de edición ───────────────
function editFormHTML(s) {
  const d = s.data;
  const v = (t) => (t || "").replace(/"/g, "&quot;");
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
    <div class="card-header card-header--editing">
      <div class="card-header-top">
        <div class="card-number">···</div>
        <div class="edit-mode-label">✎ Modo edición</div>
      </div>
      <h3 class="card-title" style="opacity:.5">Editando guion…</h3>
    </div>

    <div class="edit-form">
      <div class="edit-group">
        <label class="edit-label">Título</label>
        <input class="edit-input" data-field="titulo" type="text" value="${v(d.titulo)}">
      </div>
      <div class="edit-group">
        <label class="edit-label">Objetivo</label>
        <input class="edit-input" data-field="objetivo" type="text" value="${v(d.objetivo)}">
      </div>
      <div class="edit-group">
        <label class="edit-label">Gancho (primeros 3 seg.)</label>
        <textarea class="edit-textarea" data-field="gancho" rows="2">${esc(d.gancho)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Guion completo</label>
        <textarea class="edit-textarea" data-field="guion" rows="9">${esc(d.guion)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Escenas — una por línea</label>
        <textarea class="edit-textarea" data-field="escenas" rows="5">${esc((d.escenas || []).join("\n"))}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Textos en pantalla — uno por línea</label>
        <textarea class="edit-textarea" data-field="textos_pantalla" rows="4">${esc((d.textos_pantalla || []).join("\n"))}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Call to action</label>
        <textarea class="edit-textarea" data-field="cta" rows="2">${esc(d.cta)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Copy para Instagram</label>
        <textarea class="edit-textarea" data-field="copy_instagram" rows="6">${esc(d.copy_instagram)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Hashtags — separados por espacio</label>
        <input class="edit-input" data-field="hashtags" type="text" value="${v((d.hashtags || []).join(" "))}">
      </div>

      <div class="edit-actions">
        <button class="btn-cancel-edit" data-action="cancel">✕ Cancelar</button>
        <button class="btn-save-edit"   data-action="save">✓ Guardar cambios</button>
      </div>
    </div>`;
}

// ─── Acciones de tarjeta ──────────────────────────
function showEditMode(id) {
  const s = allScripts.find((x) => x.id === id);
  if (!s || s.error) return;
  const card = document.querySelector(`[data-script-id="${id}"]`);
  card.classList.add("is-editing");
  card.innerHTML = editFormHTML(s);
  renumberCards();
}

function cancelEdit(id) {
  const s = allScripts.find((x) => x.id === id);
  if (!s) return;
  const card = document.querySelector(`[data-script-id="${id}"]`);
  card.classList.remove("is-editing");
  card.innerHTML = cardContentHTML(s);
  renumberCards();
}

function saveEdit(id) {
  const s = allScripts.find((x) => x.id === id);
  if (!s) return;
  const card = document.querySelector(`[data-script-id="${id}"]`);

  const get = (field) => card.querySelector(`[data-field="${field}"]`)?.value || "";

  s.data.titulo          = get("titulo");
  s.data.objetivo        = get("objetivo");
  s.data.gancho          = get("gancho");
  s.data.guion           = get("guion");
  s.data.cta             = get("cta");
  s.data.copy_instagram  = get("copy_instagram");
  s.data.escenas         = get("escenas").split("\n").map((l) => l.trim()).filter(Boolean);
  s.data.textos_pantalla = get("textos_pantalla").split("\n").map((l) => l.trim()).filter(Boolean);
  s.data.hashtags        = get("hashtags").split(/\s+/).filter(Boolean);

  card.classList.remove("is-editing");
  card.innerHTML = cardContentHTML(s);
  renumberCards();
  saveToStorage();
}

function deleteCard(id) {
  if (!confirm("¿Eliminar este guion?")) return;
  allScripts = allScripts.filter((s) => s.id !== id);
  document.querySelector(`[data-script-id="${id}"]`)?.remove();
  renumberCards();
  updateWordBtn();
  saveToStorage();
  if (allScripts.length === 0) resultsActions.classList.remove("visible");
}

function clearAll() {
  const n = allScripts.length;
  if (n === 0) return;
  if (!confirm(`¿Eliminar todos los ${n} guiones? Esta acción no se puede deshacer.`)) return;
  allScripts = [];
  nextId = 1;
  resultsContainer.innerHTML = "";
  resultsActions.classList.remove("visible");
  saveToStorage();
}

// ─── Descargar Word (.doc, sin dependencias) ──────
function downloadWord() {
  const valid = allScripts.filter((s) => !s.error && s.data);
  if (valid.length === 0) return;

  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let body = `
    <h1 style="color:#1D9E75;text-align:center;font-size:22pt;margin-bottom:4pt;">
      HIPOPÓTAMO PINTURAS Y DECORACIÓN
    </h1>
    <p style="text-align:center;color:#888;font-size:12pt;margin-top:0;">
      Guiones de Reel para Instagram &mdash; ${esc(today)}
    </p>
    <p style="text-align:center;color:#888;font-size:10pt;font-style:italic;margin-bottom:32pt;">
      ${valid.length} guion${valid.length !== 1 ? "es" : ""} seleccionado${valid.length !== 1 ? "s" : ""}
    </p>`;

  valid.forEach((s, i) => {
    const d = s.data;

    const escenasHTML = (d.escenas || []).map((e, idx) =>
      `<li style="margin-bottom:5pt;">${esc(e)}</li>`).join("");

    const textosHTML = (d.textos_pantalla || []).map((t, idx) =>
      `<span style="display:inline-block;background:#e8f7f2;color:#177a5b;border:1px solid #b2dece;
        border-radius:12pt;padding:3pt 10pt;margin:2pt 4pt 2pt 0;font-size:10pt;">[${idx + 1}] ${esc(t)}</span>`
    ).join("");

    const hashtagsHTML = (d.hashtags || []).map((h) =>
      `<span style="color:#3b4fc4;margin-right:8pt;font-size:10pt;">${esc(h)}</span>`
    ).join("");

    const guionHTML   = esc(d.guion || "").replace(/\n/g, "<br>");
    const copyHTML    = esc(d.copy_instagram || "").replace(/\n/g, "<br>");

    if (i > 0) body += `<hr style="border:none;border-top:1pt solid #ddd;margin:28pt 0;">`;

    body += `
      <p style="color:#1D9E75;font-size:10pt;font-weight:bold;letter-spacing:1pt;margin-bottom:2pt;">
        GUIÓN ${i + 1} DE ${valid.length}
      </p>
      <h2 style="color:#1a1a2e;font-size:17pt;margin-top:0;border-bottom:2pt solid #1D9E75;padding-bottom:6pt;">
        ${esc(d.titulo)}
      </h2>

      <p class="lbl">Objetivo</p>
      <p style="font-style:italic;color:#177a5b;">${esc(d.objetivo)}</p>

      <p class="lbl">Gancho — Primeros 3 segundos</p>
      <p style="font-size:14pt;font-weight:bold;color:#177a5b;border-left:4pt solid #1D9E75;padding-left:10pt;">
        ${esc(d.gancho)}
      </p>

      <p class="lbl">Guión completo (palabra por palabra)</p>
      <p style="font-size:11pt;line-height:1.9;background:#fafafa;border:1pt solid #e2e8f0;padding:10pt;border-radius:6pt;">
        ${guionHTML}
      </p>

      <p class="lbl">Plan de grabación por escenas</p>
      <ol style="margin:0;padding-left:18pt;">${escenasHTML}</ol>

      <p class="lbl">Textos en pantalla</p>
      <p>${textosHTML}</p>

      <p class="lbl">Call to action</p>
      <p style="font-size:12pt;font-weight:bold;background:#e8f7f2;padding:10pt;border-radius:6pt;">
        ${esc(d.cta)}
      </p>

      <p class="lbl">Copy para pie de foto de Instagram</p>
      <p style="font-size:11pt;line-height:1.8;background:#fafafa;border:1pt solid #e2e8f0;padding:10pt;border-radius:6pt;">
        ${copyHTML}
      </p>

      <p class="lbl">Hashtags</p>
      <p>${hashtagsHTML}</p>`;
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <title>Guiones Hipopótamo</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 40pt; }
        .lbl { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1pt;
               color: #888888; margin-top: 14pt; margin-bottom: 4pt; }
        li { font-size: 11pt; }
      </style>
    </head>
    <body>${body}</body>
    </html>`;

  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `guiones-hipopotamo-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers UI ───────────────────────────────────
function updateWordBtn() {
  const n = allScripts.filter((s) => !s.error).length;
  wordBtn.textContent = `📄 Descargar Word (${n} guion${n !== 1 ? "es" : ""})`;
}

function setLoading(on) {
  loadingEl.classList.toggle("visible", on);
  generateBtn.disabled   = on;
  regenerateBtn.disabled = on;
  wordBtn.disabled       = on;
}

function showError(msg) {
  errorBox.textContent = `Error: ${msg}`;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
}

// ─── Inicialización: cargar guiones guardados ─────
(function init() {
  loadFromStorage();
  if (allScripts.length > 0) {
    appendCards(allScripts);
    resultsActions.classList.add("visible");
    updateWordBtn();
  }
})();
