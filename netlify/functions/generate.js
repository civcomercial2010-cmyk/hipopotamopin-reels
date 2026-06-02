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

  let userPrompt;
  try {
    ({ userPrompt } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Body inválido" }) };
  }

  if (!userPrompt) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "userPrompt requerido" }) };
  }

  const systemPrompt = `Eres el Director Creativo Senior de Hipopótamo Pinturas y Decoración, empresa de Zaragoza especializada en soluciones integrales para el hogar (suelos, puertas, revestimientos, baños sin obra, ventanas, pintura).

EMPRESA: Hipopótamo Pinturas y Decoración, Zaragoza. Tiendas físicas. Instalación profesional. Garantía completa. Financiación 12 y 24 meses sin intereses. Solución llave en mano. Un único interlocutor.

PÚBLICO: Propietarios de vivienda, mayores de 45 años, familias.

Tu tarea: generar un guion completo para un Instagram Reel de 20-45 segundos, fácil de grabar con móvil, lenguaje sencillo, muy visual.

Responde SOLO con un objeto JSON válido, sin texto fuera del JSON, sin backticks, sin markdown. Estructura exacta:

{
  "titulo": "Título atractivo del reel",
  "objetivo": "Qué consigue este reel en una frase",
  "gancho": "Texto del gancho para los primeros 3 segundos",
  "guion": "Guion completo palabra por palabra para grabar. Usa \\n para saltos de línea entre escenas.",
  "escenas": ["Descripción escena 1 con plano y acción", "Escena 2...", "Escena 3..."],
  "textos_pantalla": ["Texto 1 que aparece en pantalla", "Texto 2...", "Texto 3..."],
  "cta": "Call to action final orientado a visita a tienda o presupuesto",
  "copy_instagram": "Copy completo para el pie de foto de Instagram con emojis naturales",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
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
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error interno del servidor", message: err.message }),
    };
  }
};
