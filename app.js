const generateBtn = document.getElementById("generateBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const copyBtn = document.getElementById("copyBtn");
const loadingEl = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");
const resultEl = document.getElementById("result");

let lastPrompt = "";

// ─── Ideas rápidas ────────────────────────────────
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const idea = btn.dataset.idea;
    document.getElementById("tema").value = "sorpréndeme (elige el tema más efectivo para el canal)";
    triggerGenerate(buildPrompt(idea));
  });
});

// ─── Botón principal ──────────────────────────────
generateBtn.addEventListener("click", () => {
  const prompt = buildPrompt();
  triggerGenerate(prompt);
});

regenerateBtn.addEventListener("click", () => {
  if (lastPrompt) triggerGenerate(lastPrompt);
});

// ─── Construcción del prompt ──────────────────────
function buildPrompt(quickIdea = null) {
  const tema = quickIdea || document.getElementById("tema").value;
  const formato = document.getElementById("formato").value;
  const objecion = document.getElementById("objecion").value;
  const incluir = document.getElementById("incluir").value;

  let prompt = `Genera un guion completo de Reel para Hipopótamo sobre: ${tema}.`;

  if (formato) prompt += `\nFormato del vídeo: ${formato}.`;
  if (objecion) prompt += `\nObjeción principal a abordar: ${objecion}.`;
  if (incluir) prompt += `\nÉnfasis adicional: ${incluir}.`;

  prompt += `\nTermina el CTA con: "Hipopótamo, centros muy cerca de ti." cuando encaje naturalmente.`;

  return prompt;
}

// ─── Llamada a la API ─────────────────────────────
async function triggerGenerate(prompt) {
  lastPrompt = prompt;

  setLoading(true);
  hideError();
  hideResult();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPrompt: prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Error ${res.status}`);
    }

    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Respuesta vacía de la API");

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("La respuesta no es JSON válido");
    }

    renderResult(parsed);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ─── Renderizado del resultado ────────────────────
function renderResult(d) {
  document.getElementById("rTitulo").textContent = d.titulo || "";
  document.getElementById("rObjetivo").textContent = d.objetivo || "";
  document.getElementById("rGancho").textContent = d.gancho || "";
  document.getElementById("rGuion").textContent = d.guion || "";
  document.getElementById("rCta").textContent = d.cta || "";
  document.getElementById("rCopy").textContent = d.copy_instagram || "";

  // Escenas
  const escenasList = document.getElementById("rEscenas");
  escenasList.innerHTML = "";
  (d.escenas || []).forEach((e) => {
    const li = document.createElement("li");
    li.textContent = e;
    escenasList.appendChild(li);
  });

  // Textos en pantalla
  const textosEl = document.getElementById("rTextosPantalla");
  textosEl.innerHTML = "";
  (d.textos_pantalla || []).forEach((t) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = t;
    textosEl.appendChild(chip);
  });

  // Hashtags
  const hashtagsEl = document.getElementById("rHashtags");
  hashtagsEl.innerHTML = "";
  (d.hashtags || []).forEach((h) => {
    const chip = document.createElement("span");
    chip.className = "chip hashtag";
    chip.textContent = h;
    hashtagsEl.appendChild(chip);
  });

  resultEl.classList.add("visible");
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Copiar guion ─────────────────────────────────
copyBtn.addEventListener("click", () => {
  const guion = document.getElementById("rGuion").textContent;
  if (!guion) return;

  navigator.clipboard.writeText(guion).then(() => {
    copyBtn.textContent = "✅ Copiado";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "📋 Copiar guion";
      copyBtn.classList.remove("copied");
    }, 2000);
  });
});

// ─── Helpers UI ───────────────────────────────────
function setLoading(on) {
  loadingEl.classList.toggle("visible", on);
  generateBtn.disabled = on;
  regenerateBtn.disabled = on;
}

function showError(msg) {
  errorBox.textContent = `Error: ${msg}`;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
}

function hideResult() {
  resultEl.classList.remove("visible");
}
