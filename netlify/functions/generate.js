exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  let userPrompt, tipo;
  try {
    ({ userPrompt, tipo } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Body inválido" }) };
  }

  if (!userPrompt) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "userPrompt requerido" }) };
  }

  const EMPRESA = `EMPRESA: Hipopótamo Pinturas y Decoración, Zaragoza. Tiendas físicas. Instalación profesional. Garantía completa. Financiación 12 y 24 meses sin intereses. Solución llave en mano. Un único interlocutor.

PÚBLICO: Propietarios de vivienda, mayores de 45 años, familias.`;

  const systemPromptReel = `Eres el Director Creativo Senior de Hipopótamo Pinturas y Decoración, empresa de Zaragoza especializada en soluciones integrales para el hogar (suelos, puertas, revestimientos, baños sin obra, ventanas, pintura).

${EMPRESA}

Tu tarea: generar un guion completo para un Instagram Reel de 20-45 segundos, fácil de grabar con móvil, lenguaje sencillo, muy visual.

Responde SOLO con un objeto JSON válido, sin texto fuera del JSON, sin backticks, sin markdown. Estructura exacta:

{
  "titulo": "Título atractivo del reel",
  "objetivo": "Qué consigue este reel en una frase",
  "gancho": "Texto del gancho para los primeros 3 segundos",
  "guion": "SOLO el texto que se dice en voz alta, palabra por palabra, tal cual se lee al grabar. No incluyas acotaciones de cámara, planos, ni descripciones de escena o acción: eso va aparte en 'escenas'. Usa \\n para separar frases o pausas naturales del habla.",
  "escenas": ["Descripción escena 1 con plano y acción", "Escena 2...", "Escena 3..."],
  "textos_pantalla": ["Texto 1 que aparece en pantalla", "Texto 2...", "Texto 3..."],
  "cta": "Call to action final orientado a visita a tienda o presupuesto",
  "copy_instagram": "Copy completo para el pie de foto de Instagram con emojis naturales",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}`;

  const systemPromptRadio = `Eres el Director Creativo Senior de Hipopótamo Pinturas y Decoración, empresa de Zaragoza especializada en soluciones integrales para el hogar (suelos, puertas, revestimientos, baños sin obra, ventanas, pintura).

${EMPRESA}

Tu tarea: generar el guion de una cuña de radio de exactamente 15 segundos (unas 35-40 palabras leídas a ritmo normal de locución), pensada para un locutor profesional. No hay ningún elemento visual: todo el impacto depende de la voz, el tono y el sonido.

Responde SOLO con un objeto JSON válido, sin texto fuera del JSON, sin backticks, sin markdown. Estructura exacta:

{
  "titulo": "Título identificativo de la cuña",
  "objetivo": "Qué consigue esta cuña en una frase",
  "gancho": "Primeras palabras que captan la atención en los primeros 3 segundos",
  "guion": "Guion completo palabra por palabra para el locutor, pensado para durar 15 segundos en voz alta. Incluye acotaciones de tono, énfasis y pausas entre corchetes justo antes de la frase a la que afectan, por ejemplo: [Tono cercano y cálido] Frase de gancho... [pausa breve] ...frase siguiente. [Tono seguro y directo] Frase del CTA. Usa \\n entre bloques de locución.",
  "musica_ambiente": "Sugerencia breve de música de fondo o efectos de sonido para la producción de la cuña",
  "cta": "Call to action final, claro y memorable, orientado a visita a tienda o presupuesto",
  "duracion_estimada": "Duración estimada en segundos del guion leído en voz alta, debe rondar 15"
}`;

  const systemPrompt = tipo === "radio" ? systemPromptRadio : systemPromptReel;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Groq retiró llama-3.3-70b-versatile el 16/08/2026 y desde entonces
        // devuelve 404 model_not_found. Este es uno de los dos sustitutos que
        // recomienda su documentación de deprecaciones.
        model: "openai/gpt-oss-120b",
        max_tokens: 2048,
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Error de API: ${response.status}`, details: errorData }),
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Respuesta vacía de Groq");

    return { statusCode: 200, headers, body: JSON.stringify({ content: [{ text }] }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error interno del servidor", message: err.message }),
    };
  }
};
