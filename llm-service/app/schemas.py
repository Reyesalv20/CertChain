from typing import Any, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Contrato del /chat "libre" ya existente (usado por backend/frontend, ver
    frontend/API_CONTRACT.md). No lo cambies sin avisar al equipo."""

    pregunta: str


class ContextualChatRequest(BaseModel):
    """Contrato para el chat guiado por contexto ya resuelto por el backend.
    Permite una conversación sobre la landing o sobre una verificación ya hecha.
    """

    mensaje: Optional[str] = None
    pregunta: Optional[str] = None
    pagina: str = "verificacion"
    contexto: Optional[dict[str, Any]] = None
    historial: Optional[list[dict[str, Any]]] = None
    instrucciones: Optional[list[str]] = None
    uid_rfid: Optional[str] = None


class RfidChatRequest(BaseModel):
    """Lo que envía el flujo RFID: alguien escanea una credencial física y
    hace una pregunta sobre el/los certificado(s) asociados."""

    uid_rfid: str = Field(
        ..., description="UID leído del tag RFID (credenciales_fisicas.uid_rfid)"
    )
    pregunta: str = Field(..., description="Pregunta del usuario sobre su(s) certificado(s)")


class CertificadoContexto(BaseModel):
    """Forma de un certificado tal como debería devolverlo el backend.
    Coincide con el certificado de GET /certificados/verificar
    (frontend/API_CONTRACT.md) para no inventar un shape nuevo."""

    id: Optional[str] = None
    codigo: Optional[str] = None
    nombreEstudiante: Optional[str] = None
    carrera: Optional[str] = None
    fechaEmision: Optional[str] = None
    institucion: Optional[str] = None
    hash: Optional[str] = None
    estado: Optional[str] = None


class ChatResponse(BaseModel):
    respuesta: str
    modelo: str
    certificados_encontrados: int
