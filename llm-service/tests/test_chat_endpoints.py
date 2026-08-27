from fastapi.testclient import TestClient

from app import main
from app.prompt import NO_CERTIFICADOS_RESPUESTA

client = TestClient(main.app)

CERTIFICADO = {
    "id": "1",
    "codigo": "UAX-2024-0847-MENG",
    "nombreEstudiante": "Carlos Mendoza Ríos",
    "carrera": "Ingeniería en Sistemas",
}


def test_chat_llama3_responde_con_contexto(monkeypatch):
    async def fake_certificados(uid_rfid):
        assert uid_rfid == "04A224B2"
        return [CERTIFICADO]

    async def fake_preguntar(model, prompt):
        assert model == "llama3"
        assert "Carlos Mendoza Ríos" in prompt
        return "Es de Ingeniería en Sistemas."

    monkeypatch.setattr(main, "get_certificados_por_rfid", fake_certificados)
    monkeypatch.setattr(main, "preguntar", fake_preguntar)

    response = client.post(
        "/chat/llama3", json={"uid_rfid": "04A224B2", "pregunta": "¿de qué carrera es?"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["respuesta"] == "Es de Ingeniería en Sistemas."
    assert body["modelo"] == "llama3"
    assert body["certificados_encontrados"] == 1


def test_chat_mistral_usa_su_propio_modelo(monkeypatch):
    async def fake_certificados(uid_rfid):
        return [CERTIFICADO]

    modelos_usados = []

    async def fake_preguntar(model, prompt):
        modelos_usados.append(model)
        return "respuesta"

    monkeypatch.setattr(main, "get_certificados_por_rfid", fake_certificados)
    monkeypatch.setattr(main, "preguntar", fake_preguntar)

    response = client.post("/chat/mistral", json={"uid_rfid": "x", "pregunta": "y"})

    assert response.status_code == 200
    assert response.json()["modelo"] == "mistral"
    assert modelos_usados == ["mistral"]


def test_chat_sin_certificados_no_llama_a_ollama(monkeypatch):
    async def fake_certificados(uid_rfid):
        return []

    def fail_si_se_llama(*args, **kwargs):
        raise AssertionError("no debería llamar a Ollama sin certificados")

    monkeypatch.setattr(main, "get_certificados_por_rfid", fake_certificados)
    monkeypatch.setattr(main, "preguntar", fail_si_se_llama)

    response = client.post(
        "/chat/llama3", json={"uid_rfid": "no-existe", "pregunta": "¿qué certificados tengo?"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["respuesta"] == NO_CERTIFICADOS_RESPUESTA
    assert body["certificados_encontrados"] == 0


def test_chat_devuelve_502_si_ollama_falla(monkeypatch):
    async def fake_certificados(uid_rfid):
        return [CERTIFICADO]

    async def fake_preguntar(model, prompt):
        from app.ollama_client import OllamaError

        raise OllamaError("boom")

    monkeypatch.setattr(main, "get_certificados_por_rfid", fake_certificados)
    monkeypatch.setattr(main, "preguntar", fake_preguntar)

    response = client.post("/chat/llama3", json={"uid_rfid": "x", "pregunta": "y"})

    assert response.status_code == 502
