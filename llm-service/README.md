# llm-service — FastAPI + Ollama (puerto 5000)

Asistente con RAG (Retrieval-Augmented Generation) sobre la base de conocimiento del proyecto (ej. preguntas frecuentes sobre certificados, cómo verificar uno, etc.).

## Cómo levantarlo

```bash
# Levanta llm-service + ollama (su única dependencia)
docker compose up llm-service
```

Acceso:
- API: http://localhost:5000/health
- Docs interactivas (Swagger, autogeneradas por FastAPI): http://localhost:5000/docs
- Ollama directo: http://localhost:11434

## Estado actual: placeholder funcional + flujo RFID

`app/main.py` expone estos endpoints:

- `GET /health` → confirma que el servicio está arriba.
- `GET /health/ollama` → intenta conectarse a Ollama (`OLLAMA_URL`) y reporta si responde.
- `POST /chat` → recibe `{ "pregunta": "..." }` y responde con un mensaje fijo de placeholder. **Aquí es donde implementas la lógica real de RAG.**

No rompas la forma del endpoint `/chat` sin avisar al equipo: `backend` y `frontend` van a integrar contra ese contrato (`POST /chat` con `{ pregunta }` → `{ respuesta }`).

### Flujo RFID (contexto restringido, no RAG genérico)

- `POST /chat/llama3` y `POST /chat/mistral` → un endpoint por modelo servido en Ollama.

  Body:
  ```json
  { "uid_rfid": "04A224B2", "pregunta": "¿cuándo se emitió este certificado?" }
  ```

  Respuesta:
  ```json
  { "respuesta": "...", "modelo": "llama3", "certificados_encontrados": 1 }
  ```

  Qué hacen internamente (ver `app/main.py`, `app/certificados_client.py`, `app/prompt.py`, `app/ollama_client.py`):
  1. Buscan los certificados asociados a `uid_rfid` (`GET /certificados/por-rfid/:uid` en backend — **todavía no existe**, ver [`RFID_CONTRACT.md`](./RFID_CONTRACT.md)). Mientras tanto responden con datos de prueba (`MOCK_CERTIFICADOS=true`, uid de prueba: `04A224B2`).
  2. Si no hay certificados, responden un mensaje fijo sin llamar a Ollama.
  3. Si hay, arman un único prompt (instrucciones + certificados formateados + pregunta) y llaman a `POST {OLLAMA_URL}/api/chat` con `model` fijo (`llama3` o `mistral`) y `stream: false`.
  4. Devuelven el texto de la respuesta del modelo.

  El modelo solo debe responder en base al contexto de certificados que se le da — no se le permite inventar (instrucción explícita en `app/prompt.py::SYSTEM_INSTRUCTIONS`).

## Qué falta implementar (tu parte)

1. **Ingesta / indexado**: cargar los documentos fuente (FAQ, políticas de certificación, etc.) y generar embeddings.
2. **Vector store**: elegir uno (ej. Chroma, FAISS, pgvector) y agregarlo como dependencia + posiblemente otro contenedor en `docker-compose.yml` de la raíz si necesita persistencia propia.
3. **Retrieval**: dado `pregunta`, buscar los fragmentos más relevantes.
4. **Generación**: armar el prompt con el contexto recuperado y llamar al modelo servido por Ollama.
5. **Descargar un modelo en Ollama** (se hace una vez, desde tu máquina, con los contenedores corriendo):
   ```bash
   docker compose exec ollama ollama pull llama3
   ```
   Los modelos quedan en el volumen `ollama-data`, persisten entre reinicios.

## Variables de entorno

Ver `app/config.py` para todas, con sus valores por defecto. Las principales:

| Variable | Default | Para qué |
|---|---|---|
| `OLLAMA_URL` | `http://ollama:11434` | Servidor de Ollama. Cambialo en tu `.env` de la raíz si Ollama corre en otra máquina (ej. túnel de Cloudflare: `https://xxx.trycloudflare.com`). |
| `OLLAMA_MODEL_LLAMA3` | `llama3` | Modelo que usa `POST /chat/llama3`. |
| `OLLAMA_MODEL_MISTRAL` | `mistral` | Modelo que usa `POST /chat/mistral`. |
| `CERTIFICADOS_SERVICE_URL` | `http://backend:4000` | Dónde buscar los certificados de un `uid_rfid` (endpoint aún no implementado, ver `RFID_CONTRACT.md`). |
| `MOCK_CERTIFICADOS` | `true` | Mientras el backend no tenga el endpoint, usa datos de prueba en vez de llamar a `CERTIFICADOS_SERVICE_URL`. Ponlo en `false` cuando el endpoint real exista. |

Dentro de Docker, `OLLAMA_URL`/`CERTIFICADOS_SERVICE_URL` usan el **nombre del servicio** (`ollama`, `backend`), no `localhost`.

## Desarrollo local sin Docker (opcional)

```bash
cd llm-service
python -m venv venv
source venv/bin/activate  # en Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
```

Necesitarás Ollama corriendo aparte (`docker compose up ollama`) y ajustar `OLLAMA_URL=http://localhost:11434` si corres el servicio fuera de Docker.

## Tests

```bash
cd llm-service
pip install -r requirements-dev.txt
pytest
```

Los tests no llaman a Ollama ni a ningún backend real: mockean `certificados_client.get_certificados_por_rfid` y `ollama_client.preguntar`, así que corren sin Docker ni túnel activo.
