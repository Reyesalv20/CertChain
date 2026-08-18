import httpx

from . import config


class OllamaError(RuntimeError):
    """Ollama no respondió, respondió con error, o la respuesta no tiene el
    formato esperado."""


async def preguntar(model: str, prompt: str) -> str:
    """Envía un único mensaje "user" (ya formateado con el contexto) al
    endpoint /api/chat de Ollama y devuelve el texto de la respuesta.

    Usa stream=False: Ollama arma la respuesta completa y la devuelve de una
    sola vez, en vez de mandarla en pedacitos (más simple de manejar aquí).
    """
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=config.OLLAMA_TIMEOUT) as client:
            response = await client.post(f"{config.OLLAMA_URL}/api/chat", json=payload)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise OllamaError(f"No se pudo contactar a Ollama (modelo {model}): {exc}") from exc

    data = response.json()
    try:
        return data["message"]["content"]
    except (KeyError, TypeError) as exc:
        raise OllamaError(f"Respuesta inesperada de Ollama: {data}") from exc
