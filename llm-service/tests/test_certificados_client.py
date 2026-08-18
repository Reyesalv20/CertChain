import asyncio

import httpx
import pytest

from app import certificados_client, config


def test_mock_devuelve_certificados_para_uid_conocido(monkeypatch):
    monkeypatch.setattr(config, "MOCK_CERTIFICADOS", True)

    certificados = asyncio.run(certificados_client.get_certificados_por_rfid("04A224B2"))

    assert len(certificados) == 1
    assert certificados[0]["codigo"] == "UAX-2024-0847-MENG"


def test_mock_devuelve_vacio_para_uid_desconocido(monkeypatch):
    monkeypatch.setattr(config, "MOCK_CERTIFICADOS", True)

    certificados = asyncio.run(certificados_client.get_certificados_por_rfid("no-existe"))

    assert certificados == []


def test_llamada_real_devuelve_vacio_en_404(monkeypatch):
    monkeypatch.setattr(config, "MOCK_CERTIFICADOS", False)

    async def fake_get(self, url):
        return httpx.Response(404, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    certificados = asyncio.run(certificados_client.get_certificados_por_rfid("uid"))

    assert certificados == []


def test_llamada_real_devuelve_certificados_en_200(monkeypatch):
    monkeypatch.setattr(config, "MOCK_CERTIFICADOS", False)

    async def fake_get(self, url):
        return httpx.Response(
            200,
            json={"uidRfid": "uid", "certificados": [{"codigo": "ABC"}]},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    certificados = asyncio.run(certificados_client.get_certificados_por_rfid("uid"))

    assert certificados == [{"codigo": "ABC"}]


def test_llamada_real_lanza_error_si_backend_inalcanzable(monkeypatch):
    monkeypatch.setattr(config, "MOCK_CERTIFICADOS", False)

    async def fake_get(self, url):
        raise httpx.ConnectError("no se pudo conectar", request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    with pytest.raises(certificados_client.CertificadosServiceError):
        asyncio.run(certificados_client.get_certificados_por_rfid("uid"))
