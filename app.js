// ─── DOM ──────────────────────────────────────────
const generateBtn       = document.getElementById("generateBtn");
const generateBtnIcon   = document.getElementById("generateBtnIcon");
const generateBtnLabel  = document.getElementById("generateBtnLabel");
const radioModeCheckbox = document.getElementById("radioModeCheckbox");
const filtersTitle      = document.getElementById("filtersTitle");
const formatoGroup      = document.getElementById("formatoGroup");
const incluirGroup      = document.getElementById("incluirGroup");
const loadingEl         = document.getElementById("loading");
const loadingText       = document.getElementById("loadingText");
const errorBox          = document.getElementById("errorBox");

const regenerateBtn      = document.getElementById("regenerateBtn");
const wordBtn             = document.getElementById("wordBtn");
const clearBtn            = document.getElementById("clearBtn");
const regenerateRadioBtn = document.getElementById("regenerateRadioBtn");
const wordRadioBtn        = document.getElementById("wordRadioBtn");
const clearRadioBtn       = document.getElementById("clearRadioBtn");

// ─── Estado dual: reels y cuñas de radio ──────────
const STATE = {
  reel: {
    items: [], nextId: 1,
    storageKey: "hipopotamo_scripts", idKey: "hipopotamo_next_id",
    container: document.getElementById("resultsContainer"),
    actions:   document.getElementById("resultsActions"),
    heading:   document.getElementById("reelResultsHeading"),
    wordBtn,
    render: cardContentHTML,
    edit:   editFormHTML,
    saveFields: saveReelFields,
  },
  radio: {
    items: [], nextId: 1,
    storageKey: "hipopotamo_spots", idKey: "hipopotamo_spots_next_id",
    container: document.getElementById("resultsContainerRadio"),
    actions:   document.getElementById("resultsActionsRadio"),
    heading:   document.getElementById("radioResultsHeading"),
    wordBtn: wordRadioBtn,
    render: spotCardHTML,
    edit:   spotEditFormHTML,
    saveFields: saveRadioFields,
  },
};

// ─── Eventos principales ──────────────────────────
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const isRadio = radioModeCheckbox.checked;
    triggerGenerate(isRadio ? "radio" : "reel", isRadio ? buildRadioPrompt(btn.dataset.idea) : buildPrompt(btn.dataset.idea));
  });
});

generateBtn.addEventListener("click", () => {
  const isRadio = radioModeCheckbox.checked;
  triggerGenerate(isRadio ? "radio" : "reel", isRadio ? buildRadioPrompt() : buildPrompt());
});

radioModeCheckbox.addEventListener("change", () => {
  const isRadio = radioModeCheckbox.checked;
  filtersTitle.textContent   = isRadio ? "Configura tus cuñas de radio" : "Configura tus Reels";
  formatoGroup.classList.toggle("hidden", isRadio);
  incluirGroup.classList.toggle("hidden", isRadio);
  generateBtnIcon.textContent  = isRadio ? "🎙️" : "✨";
  generateBtnLabel.textContent = isRadio ? "Generar 3 cuñas" : "Generar 3 guiones";
  loadingText.textContent = isRadio
    ? "Generando 3 cuñas de radio personalizadas…"
    : "Generando 3 guiones personalizados…";
});

regenerateBtn.addEventListener("click",      () => triggerGenerate("reel",  buildPrompt()));
regenerateRadioBtn.addEventListener("click", () => triggerGenerate("radio", buildRadioPrompt()));
wordBtn.addEventListener("click",             () => downloadWord("reel"));
wordRadioBtn.addEventListener("click",        () => downloadWord("radio"));
clearBtn.addEventListener("click",            () => clearAll("reel"));
clearRadioBtn.addEventListener("click",       () => clearAll("radio"));

// Delegación de eventos en tarjetas (una por tipo, contenedores independientes)
STATE.reel.container.addEventListener("click",  (e) => handleCardAction(e, "reel"));
STATE.radio.container.addEventListener("click", (e) => handleCardAction(e, "radio"));

function handleCardAction(e, type) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const card = btn.closest("[data-script-id]");
  if (!card) return;
  const id = parseInt(card.dataset.scriptId, 10);
  const action = btn.dataset.action;
  if (action === "edit")   showEditMode(type, id);
  if (action === "delete") deleteCard(type, id);
  if (action === "save")   saveEdit(type, id);
  if (action === "cancel") cancelEdit(type, id);
}

// ─── Construcción de prompts ──────────────────────
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

function buildRadioPrompt(quickIdea = null) {
  const tema     = quickIdea || document.getElementById("tema").value;
  const objecion = document.getElementById("objecion").value;

  let prompt = `Genera el guion de una cuña de radio de 15 segundos para Hipopótamo sobre: ${tema}.`;
  if (objecion) prompt += `\nObjeción principal a abordar: ${objecion}.`;
  prompt += `\nTermina el CTA con: "Hipopótamo, 8 centros muy cerca de ti." cuando encaje naturalmente.`;
  prompt += `\nIMPORTANTE: esta cuña debe tener un gancho, estructura y enfoque completamente diferente a cualquier otra.`;
  return prompt;
}

// ─── Llamada individual ───────────────────────────
async function callAPI(prompt, tipo) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt: prompt, tipo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Respuesta vacía");
  return JSON.parse(text);
}

// ─── Generar 3 elementos y acumular ───────────────
async function triggerGenerate(type, prompt) {
  const st = STATE[type];
  setLoading(true);
  hideError();

  try {
    const results = await Promise.allSettled([
      callAPI(prompt, type), callAPI(prompt, type), callAPI(prompt, type),
    ]);

    const newBatch = results.map((r) =>
      r.status === "fulfilled"
        ? { id: st.nextId++, data: r.value, error: false }
        : { id: st.nextId++, data: null,    error: true  }
    );

    st.items.push(...newBatch);
    saveToStorage(type);
    appendCards(type, newBatch);

    const validCount = st.items.filter((s) => !s.error).length;
    if (validCount > 0) {
      st.actions.classList.add("visible");
      st.heading.classList.add("visible");
      updateWordBtn(type);
    }

    const firstNew = st.container.querySelector(`[data-script-id="${newBatch[0].id}"]`);
    if (firstNew) firstNew.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ─── Añadir tarjetas al DOM ───────────────────────
function appendCards(type, scripts) {
  const st = STATE[type];
  scripts.forEach((s) => {
    const div = document.createElement("div");
    div.className = "result-card" + (s.error ? " result-card--error" : "");
    div.dataset.scriptId = s.id;
    div.innerHTML = s.error ? errorCardHTML(s.id) : st.render(s);
    st.container.appendChild(div);
  });
  renumberCards(type);
}

// ─── Renumerar tarjetas de un tipo ────────────────
function renumberCards(type) {
  const st = STATE[type];
  const total = st.items.length;
  const noun = type === "radio" ? "Cuña" : "Guión";
  st.items.forEach((s, i) => {
    const card = st.container.querySelector(`[data-script-id="${s.id}"]`);
    if (!card) return;
    const numEl = card.querySelector(".card-number");
    if (numEl) numEl.innerHTML = `${noun} ${i + 1} <span class="of-total">/ ${total}</span>`;
  });
}

// ─── HTML de tarjeta: Reel ────────────────────────
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

// ─── HTML de tarjeta: Cuña de radio ───────────────
function spotCardHTML(s) {
  const d = s.data;
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
      <span class="badge-radio">🎙️ Cuña de radio · 15 seg.</span>
    </div>

    <div class="section-card">
      <div class="section-label">🎯 Gancho (primeros 3 segundos)</div>
      <p class="gancho-text">${esc(d.gancho)}</p>
    </div>

    <div class="section-card">
      <div class="section-label">🎙️ Guion de locución</div>
      <p class="guion-text">${esc(d.guion).replace(/\n/g, "<br>")}</p>
    </div>

    <div class="section-card">
      <div class="section-label">🎵 Música / efectos de fondo</div>
      <p class="cta-text" style="background:#fff7ed;color:#c2410c;">${esc(d.musica_ambiente)}</p>
    </div>

    <div class="section-card">
      <div class="section-label">📣 Call to action</div>
      <p class="cta-text">${esc(d.cta)}</p>
    </div>

    <div class="section-card">
      <div class="section-label">⏱ Duración estimada</div>
      <p class="guion-text">${esc(d.duracion_estimada)}</p>
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

// ─── HTML del formulario de edición: Reel ─────────
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

// ─── HTML del formulario de edición: Cuña de radio ─
function spotEditFormHTML(s) {
  const d = s.data;
  const v = (t) => (t || "").replace(/"/g, "&quot;");
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
    <div class="card-header card-header--editing">
      <div class="card-header-top">
        <div class="card-number">···</div>
        <div class="edit-mode-label">✎ Modo edición</div>
      </div>
      <h3 class="card-title" style="opacity:.5">Editando cuña…</h3>
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
        <label class="edit-label">Guion de locución (acotaciones de tono/pausas entre corchetes)</label>
        <textarea class="edit-textarea" data-field="guion" rows="7">${esc(d.guion)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Música / efectos de fondo</label>
        <textarea class="edit-textarea" data-field="musica_ambiente" rows="2">${esc(d.musica_ambiente)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Call to action</label>
        <textarea class="edit-textarea" data-field="cta" rows="2">${esc(d.cta)}</textarea>
      </div>
      <div class="edit-group">
        <label class="edit-label">Duración estimada</label>
        <input class="edit-input" data-field="duracion_estimada" type="text" value="${v(d.duracion_estimada)}">
      </div>

      <div class="edit-actions">
        <button class="btn-cancel-edit" data-action="cancel">✕ Cancelar</button>
        <button class="btn-save-edit"   data-action="save">✓ Guardar cambios</button>
      </div>
    </div>`;
}

// ─── Extracción de campos al guardar edición ──────
function saveReelFields(card, d) {
  const get = (field) => card.querySelector(`[data-field="${field}"]`)?.value || "";
  d.titulo          = get("titulo");
  d.objetivo        = get("objetivo");
  d.gancho          = get("gancho");
  d.guion           = get("guion");
  d.cta             = get("cta");
  d.copy_instagram  = get("copy_instagram");
  d.escenas         = get("escenas").split("\n").map((l) => l.trim()).filter(Boolean);
  d.textos_pantalla = get("textos_pantalla").split("\n").map((l) => l.trim()).filter(Boolean);
  d.hashtags        = get("hashtags").split(/\s+/).filter(Boolean);
}

function saveRadioFields(card, d) {
  const get = (field) => card.querySelector(`[data-field="${field}"]`)?.value || "";
  d.titulo             = get("titulo");
  d.objetivo           = get("objetivo");
  d.gancho             = get("gancho");
  d.guion              = get("guion");
  d.musica_ambiente    = get("musica_ambiente");
  d.cta                = get("cta");
  d.duracion_estimada  = get("duracion_estimada");
}

// ─── Acciones de tarjeta ──────────────────────────
function showEditMode(type, id) {
  const st = STATE[type];
  const s = st.items.find((x) => x.id === id);
  if (!s || s.error) return;
  const card = st.container.querySelector(`[data-script-id="${id}"]`);
  card.classList.add("is-editing");
  card.innerHTML = st.edit(s);
  renumberCards(type);
}

function cancelEdit(type, id) {
  const st = STATE[type];
  const s = st.items.find((x) => x.id === id);
  if (!s) return;
  const card = st.container.querySelector(`[data-script-id="${id}"]`);
  card.classList.remove("is-editing");
  card.innerHTML = st.render(s);
  renumberCards(type);
}

function saveEdit(type, id) {
  const st = STATE[type];
  const s = st.items.find((x) => x.id === id);
  if (!s) return;
  const card = st.container.querySelector(`[data-script-id="${id}"]`);

  st.saveFields(card, s.data);

  card.classList.remove("is-editing");
  card.innerHTML = st.render(s);
  renumberCards(type);
  saveToStorage(type);
}

function deleteCard(type, id) {
  const st = STATE[type];
  const label = type === "radio" ? "esta cuña" : "este guion";
  if (!confirm(`¿Eliminar ${label}?`)) return;
  st.items = st.items.filter((s) => s.id !== id);
  st.container.querySelector(`[data-script-id="${id}"]`)?.remove();
  renumberCards(type);
  updateWordBtn(type);
  saveToStorage(type);
  if (st.items.length === 0) {
    st.actions.classList.remove("visible");
    st.heading.classList.remove("visible");
  }
}

function clearAll(type) {
  const st = STATE[type];
  const n = st.items.length;
  if (n === 0) return;
  const label = type === "radio" ? "cuña" : "guion";
  if (!confirm(`¿Eliminar todos los ${n} ${label}${n !== 1 ? (type === "radio" ? "s" : "es") : ""}? Esta acción no se puede deshacer.`)) return;
  st.items = [];
  st.nextId = 1;
  st.container.innerHTML = "";
  st.actions.classList.remove("visible");
  st.heading.classList.remove("visible");
  saveToStorage(type);
}

// ─── Descargar Word (.doc, sin dependencias) ──────
function downloadWord(type) {
  const st = STATE[type];
  const valid = st.items.filter((s) => !s.error && s.data);
  if (valid.length === 0) return;

  const isRadio = type === "radio";
  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const heading = isRadio ? "Cuñas de radio" : "Guiones de Reel para Instagram";
  const countNoun = isRadio ? (valid.length !== 1 ? "cuñas" : "cuña") : (valid.length !== 1 ? "guiones" : "guion");

  let body = `
    <h1 style="color:#1D9E75;text-align:center;font-size:22pt;margin-bottom:4pt;">
      HIPOPÓTAMO PINTURAS Y DECORACIÓN
    </h1>
    <p style="text-align:center;color:#888;font-size:12pt;margin-top:0;">
      ${heading} &mdash; ${esc(today)}
    </p>
    <p style="text-align:center;color:#888;font-size:10pt;font-style:italic;margin-bottom:32pt;">
      ${valid.length} ${countNoun} seleccionad${valid.length !== 1 ? "os" : "o"}
    </p>`;

  valid.forEach((s, i) => {
    const d = s.data;
    if (i > 0) body += `<hr style="border:none;border-top:1pt solid #ddd;margin:28pt 0;">`;

    if (isRadio) {
      const guionHTML = esc(d.guion || "").replace(/\n/g, "<br>");

      body += `
        <p style="color:#1D9E75;font-size:10pt;font-weight:bold;letter-spacing:1pt;margin-bottom:2pt;">
          CUÑA ${i + 1} DE ${valid.length} &middot; 15 SEGUNDOS
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

        <p class="lbl">Guion de locución completo</p>
        <p style="font-size:11pt;line-height:1.9;background:#fafafa;border:1pt solid #e2e8f0;padding:10pt;border-radius:6pt;">
          ${guionHTML}
        </p>

        <p class="lbl">Música / efectos de fondo</p>
        <p>${esc(d.musica_ambiente)}</p>

        <p class="lbl">Duración estimada</p>
        <p>${esc(d.duracion_estimada)}</p>

        <p class="lbl">Call to action</p>
        <p style="font-size:12pt;font-weight:bold;background:#e8f7f2;padding:10pt;border-radius:6pt;">
          ${esc(d.cta)}
        </p>`;
    } else {
      const escenasHTML = (d.escenas || []).map((e) =>
        `<li style="margin-bottom:5pt;">${esc(e)}</li>`).join("");

      const textosHTML = (d.textos_pantalla || []).map((t, idx) =>
        `<span style="display:inline-block;background:#e8f7f2;color:#177a5b;border:1px solid #b2dece;
          border-radius:12pt;padding:3pt 10pt;margin:2pt 4pt 2pt 0;font-size:10pt;">[${idx + 1}] ${esc(t)}</span>`
      ).join("");

      const hashtagsHTML = (d.hashtags || []).map((h) =>
        `<span style="color:#3b4fc4;margin-right:8pt;font-size:10pt;">${esc(h)}</span>`
      ).join("");

      const guionHTML = esc(d.guion || "").replace(/\n/g, "<br>");
      const copyHTML  = esc(d.copy_instagram || "").replace(/\n/g, "<br>");

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
    }
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <title>${isRadio ? "Cuñas de radio Hipopótamo" : "Guiones Hipopótamo"}</title>
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
  a.download = `${isRadio ? "cunas-radio" : "guiones"}-hipopotamo-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers UI ───────────────────────────────────
function updateWordBtn(type) {
  const st = STATE[type];
  const n = st.items.filter((s) => !s.error).length;
  const label = type === "radio" ? `cuña${n !== 1 ? "s" : ""}` : `guion${n !== 1 ? "es" : ""}`;
  st.wordBtn.textContent = `📄 Descargar Word (${n} ${label})`;
}

function setLoading(on) {
  loadingEl.classList.toggle("visible", on);
  generateBtn.disabled        = on;
  regenerateBtn.disabled      = on;
  regenerateRadioBtn.disabled = on;
  wordBtn.disabled            = on;
  wordRadioBtn.disabled       = on;
}

function showError(msg) {
  errorBox.textContent = `Error: ${msg}`;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
}

// ─── Persistencia localStorage ────────────────────
function saveToStorage(type) {
  const st = STATE[type];
  try {
    localStorage.setItem(st.storageKey, JSON.stringify(st.items));
    localStorage.setItem(st.idKey, String(st.nextId));
  } catch (_) {}
}

function loadFromStorage(type) {
  const st = STATE[type];
  try {
    const raw = localStorage.getItem(st.storageKey);
    const rawId = localStorage.getItem(st.idKey);
    if (raw) {
      st.items = JSON.parse(raw);
      st.nextId = rawId ? parseInt(rawId, 10) : st.items.length + 1;
    }
  } catch (_) {
    st.items = [];
    st.nextId = 1;
  }
}

// ─── Inicialización: cargar guardado ──────────────
(function init() {
  ["reel", "radio"].forEach((type) => {
    loadFromStorage(type);
    const st = STATE[type];
    if (st.items.length > 0) {
      appendCards(type, st.items);
      st.actions.classList.add("visible");
      st.heading.classList.add("visible");
      updateWordBtn(type);
    }
  });
})();
