import os

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CertChain LLM Service")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")


class ChatRequest(BaseModel):
    pregunta: str


@app.get("/health")
async def health():
    return {"status": "ok", "service": "llm-service"}


@app.get("/health/ollama")
async def health_ollama():
    """Comprueba que el contenedor de Ollama responde (no que haya modelos descargados)."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            return {"ollama": "reachable", "status_code": response.status_code}
    except Exception as exc:  # noqa: BLE001 - placeholder, se refinará con la lógica real
        return {"ollama": "unreachable", "error": str(exc)}


# TODO (compañero LLM/RAG): reemplazar por la lógica real
# (retrieval sobre la base de conocimiento + construcción de prompt + llamada al modelo en Ollama)
@app.post("/chat")
async def chat(request: ChatRequest):
    return {
        "respuesta": "Placeholder: el servicio LLM/RAG aún no está implementado.",
        "pregunta_recibida": request.pregunta,
    }
