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

## Estado actual: placeholder funcional

`app/main.py` ya expone 3 endpoints que **funcionan**, para que el resto del equipo pueda integrar contra ellos sin esperar a que termines el RAG:

- `GET /health` → confirma que el servicio está arriba.
- `GET /health/ollama` → intenta conectarse a Ollama (`OLLAMA_URL`) y reporta si responde.
- `POST /chat` → recibe `{ "pregunta": "..." }` y responde con un mensaje fijo de placeholder. **Aquí es donde implementas la lógica real.**

No rompas la forma del endpoint `/chat` sin avisar al equipo: `backend` y `frontend` van a integrar contra ese contrato (`POST /chat` con `{ pregunta }` → `{ respuesta }`).

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

Ya configurada en `docker-compose.yml`: `OLLAMA_URL=http://ollama:11434` (nombre del servicio, no `localhost`).

## Desarrollo local sin Docker (opcional)

```bash
cd llm-service
python -m venv venv
source venv/bin/activate  # en Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
```

Necesitarás Ollama corriendo aparte (`docker compose up ollama`) y ajustar `OLLAMA_URL=http://localhost:11434` si corres el servicio fuera de Docker.
