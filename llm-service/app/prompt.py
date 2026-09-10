from typing import Iterable

SYSTEM_INSTRUCTIONS = (
    "Eres un asistente de CertChain."
"Responde solo con la información verificada del contexto."
"No inventes nombres, fechas, carreras, instituciones o estados."
"Si no hay datos suficientes, pide una sola aclaración."
"Mantén la respuesta en 1 a 3 frases."
"Si el certificado es válido, dilo claramente."
"Si está revocado o inválido, explica el motivo con precisión."
"Si es una página de landing, responde orientación general y no hables de certificados faltantes."
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


def construir_prompt_contextual(
    contexto: dict | None,
    pregunta: str,
    instrucciones: list[str] | None = None,
    pagina: str = "verificacion",
) -> str:
    """Construye un prompt compacto y consistente para respuestas breves.
    El backend ya resolvió el contexto real y solo le pasa información útil al modelo."""
    lineas = [
        "Eres un asistente de CertChain.",
        "Responde solo con la información verificada del contexto.",
        "No inventes nombres, fechas, carreras, instituciones ni estados.",
        "Mantén la respuesta en 1 a 3 frases.",
        "Si no hay suficiente información, pide solo una aclaración.",
    ]

    if pagina == "landing":
        lineas.append(
            "Esta es una conversación de landing: responde orientación general y no hables de certificados faltantes."
        )
    else:
        lineas.append("Si el documento está revocado o no existe, dilo claramente.")

    if instrucciones:
        lineas.extend(instrucciones)

    if contexto:
        lineas.append("Contexto actual:")
        lineas.append(str(contexto))

    lineas.append(f"Pregunta del usuario:\n{pregunta}")
    return "\n\n".join(lineas)
