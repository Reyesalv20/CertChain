import os

# URL del servidor de Ollama. Puede ser el contenedor local (`ollama:11434`,
# valor por defecto para docker-compose) o, en desarrollo, un túnel
# (Cloudflare/ngrok) hacia una máquina externa que corre Ollama. Para usar tu
# túnel sin tocar código, ponlo en el .env de la raíz:
#   OLLAMA_URL=https://tu-tunel.trycloudflare.com
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "60"))

# Un modelo por endpoint (ver app/main.py: /chat/llama3 y /chat/mistral).
MODEL_LLAMA3 = os.getenv("OLLAMA_MODEL_LLAMA3", "llama3")
MODEL_MISTRAL = os.getenv("OLLAMA_MODEL_MISTRAL", "mistral")

# TODO (backend): todavía no existe. Cuando exista, debe devolver los
# certificados asociados a una credencial física (uid_rfid). Ver
# llm-service/RFID_CONTRACT.md para el contrato propuesto.
CERTIFICADOS_SERVICE_URL = os.getenv("CERTIFICADOS_SERVICE_URL", "http://backend:4000")
CERTIFICADOS_TIMEOUT = float(os.getenv("CERTIFICADOS_TIMEOUT", "5"))

# Mientras el backend no exponga el endpoint real, respondemos con datos de
# prueba (ver certificados_client.py) para poder probar el flujo completo
# RFID -> contexto -> Ollama. Pon esto en "false" en cuanto el endpoint real
# exista y confirmes el contrato con el equipo de backend.
MOCK_CERTIFICADOS = os.getenv("MOCK_CERTIFICADOS", "true").lower() == "true"
