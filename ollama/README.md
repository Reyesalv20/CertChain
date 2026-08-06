# ollama (puerto 11434)

No es código propio: usa la imagen oficial `ollama/ollama` directamente desde `docker-compose.yml` (sin Dockerfile propio). Esta carpeta es solo para documentación.

## Cómo levantarlo

```bash
docker compose up ollama
```

## Descargar un modelo

Los modelos NO vienen incluidos en la imagen; hay que descargarlos una vez (persisten en el volumen `ollama-data`):

```bash
docker compose exec ollama ollama pull llama3
```

Otros modelos livianos si el equipo no tiene mucha RAM/GPU: `phi3`, `mistral`, `llama3:8b`.

## Probar que responde

```bash
curl http://localhost:11434/api/tags
```

## Notas

- El volumen `ollama-data` (definido en `docker-compose.yml`) evita tener que re-descargar modelos cada vez que se recrean los contenedores.
- `llm-service` se conecta a este servicio mediante `OLLAMA_URL=http://ollama:11434` (nombre del servicio dentro de la red de Docker).
