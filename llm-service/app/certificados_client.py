import httpx

from . import config

# --- Datos de prueba -------------------------------------------------------
# Solo para poder probar el flujo RFID -> contexto -> Ollama mientras el
# backend no expone GET /certificados/por-rfid/{uid}. Se usan cuando
# MOCK_CERTIFICADOS=true (valor por defecto). Bórralo cuando ya no haga falta.
_MOCK_DB: dict[str, list[dict]] = {
    "04A224B2": [
        {
            "id": "1",
            "codigo": "UAX-2024-0847-MENG",
            "nombreEstudiante": "Carlos Mendoza Ríos",
            "carrera": "Ingeniería en Sistemas",
            "fechaEmision": "2024-06-15",
            "institucion": "Universidad Autónoma de Xalapa",
            "hash": "0xabc123def456",
            "estado": "registrado",
        }
    ],
}


class CertificadosServiceError(RuntimeError):
    """El servicio de certificados (backend) no respondió correctamente."""


async def get_certificados_por_rfid(uid_rfid: str) -> list[dict]:
    """Devuelve los certificados asociados a una credencial física (RFID).

    TODO (backend): reemplazar por la llamada real en cuanto exista
    GET {CERTIFICADOS_SERVICE_URL}/certificados/por-rfid/{uid_rfid}.
    Contrato propuesto en llm-service/RFID_CONTRACT.md:
        200 -> { "uidRfid": "...", "certificados": [ {...}, ... ] }
        404 -> credencial no encontrada -> tratamos como lista vacía
    """
    if config.MOCK_CERTIFICADOS:
        return _MOCK_DB.get(uid_rfid, [])

    try:
        async with httpx.AsyncClient(timeout=config.CERTIFICADOS_TIMEOUT) as client:
            response = await client.get(
                f"{config.CERTIFICADOS_SERVICE_URL}/certificados/por-rfid/{uid_rfid}"
            )
    except httpx.HTTPError as exc:
        raise CertificadosServiceError(
            f"No se pudo contactar al servicio de certificados: {exc}"
        ) from exc

    if response.status_code == 404:
        return []

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise CertificadosServiceError(
            f"El servicio de certificados respondió {response.status_code}"
        ) from exc

    return response.json().get("certificados", [])
