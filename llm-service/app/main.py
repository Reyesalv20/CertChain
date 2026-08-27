import httpx
from fastapi import FastAPI, HTTPException

from . import config
from .certificados_client import CertificadosServiceError, get_certificados_por_rfid
from .ollama_client import OllamaError, preguntar
from .prompt import NO_CERTIFICADOS_RESPUESTA, construir_prompt
from .schemas import ChatRequest, ChatResponse, RfidChatRequest

app = FastAPI(title="CertChain LLM Service")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "llm-service"}


@app.get("/health/ollama")
async def health_ollama():
    """Comprueba que el servidor de Ollama (config.OLLAMA_URL) responde (no que
    haya modelos descargados)."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{config.OLLAMA_URL}/api/tags")
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


# --- Flujo RFID: escaneo -> contexto de certificados -> modelo en Ollama ---
#
# 1. El lector RFID (o quien lo simule) manda { uid_rfid, pregunta } acá.
# 2. Buscamos los certificados asociados a ese uid_rfid (certificados_client).
# 3. Armamos un único prompt: instrucciones + certificados + pregunta (prompt.py).
# 4. Se lo mandamos al modelo correspondiente en Ollama y devolvemos su respuesta.
#
# Dos endpoints (uno por modelo) para poder comparar llama3 vs. mistral sin
# tocar el body de la request.


async def _responder_con_contexto_rfid(request: RfidChatRequest, modelo: str) -> ChatResponse:
    try:
        certificados = await get_certificados_por_rfid(request.uid_rfid)
    except CertificadosServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not certificados:
        return ChatResponse(
            respuesta=NO_CERTIFICADOS_RESPUESTA,
            modelo=modelo,
            certificados_encontrados=0,
        )

    prompt = construir_prompt(certificados, request.pregunta)
    try:
        respuesta = await preguntar(modelo, prompt)
    except OllamaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ChatResponse(
        respuesta=respuesta,
        modelo=modelo,
        certificados_encontrados=len(certificados),
    )


@app.post("/chat/llama3", response_model=ChatResponse)
async def chat_llama3(request: RfidChatRequest):
    return await _responder_con_contexto_rfid(request, config.MODEL_LLAMA3)


@app.post("/chat/mistral", response_model=ChatResponse)
async def chat_mistral(request: RfidChatRequest):
    return await _responder_con_contexto_rfid(request, config.MODEL_MISTRAL)
