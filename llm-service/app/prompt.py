from typing import Iterable

SYSTEM_INSTRUCTIONS = (
    "Eres un asistente que responde preguntas sobre certificados académicos "
    "verificados en CertChain. Responde ÚNICAMENTE en base a la información de "
    "los certificados listados a continuación. No inventes datos ni asumas "
    "información que no esté presente. Si no sabes algo o no estás seguro, "
    "dilo claramente en vez de adivinar. Sé breve, preciso y conciso."
)

NO_CERTIFICADOS_RESPUESTA = (
    "No encontré ningún certificado asociado a esta credencial, así que no "
    "puedo responder tu pregunta."
)

_CAMPOS_CERTIFICADO = (
    ("Estudiante", "nombreEstudiante"),
    ("Carrera", "carrera"),
    ("Institución", "institucion"),
    ("Fecha de emisión", "fechaEmision"),
    ("Código", "codigo"),
    ("Estado", "estado"),
    ("Hash", "hash"),
)


def _formatear_certificado(numero: int, certificado: dict) -> str:
    lineas = [
        f"- {etiqueta}: {certificado[campo]}"
        for etiqueta, campo in _CAMPOS_CERTIFICADO
        if certificado.get(campo)
    ]
    cuerpo = "\n".join(lineas) if lineas else "- (sin datos)"
    return f"Certificado #{numero}:\n{cuerpo}"


def construir_prompt(certificados: Iterable[dict], pregunta: str) -> str:
    """Arma el mensaje único que se envía al modelo: instrucciones + contexto
    de los certificados (uno por bloque) + la pregunta del usuario."""
    bloques = "\n\n".join(
        _formatear_certificado(i, cert) for i, cert in enumerate(certificados, start=1)
    )
    return f"{SYSTEM_INSTRUCTIONS}\n\n{bloques}\n\nPregunta del usuario:\n{pregunta}"
