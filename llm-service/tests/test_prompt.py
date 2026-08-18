from app.prompt import SYSTEM_INSTRUCTIONS, construir_prompt

CERTIFICADO = {
    "id": "1",
    "codigo": "UAX-2024-0847-MENG",
    "nombreEstudiante": "Carlos Mendoza Ríos",
    "carrera": "Ingeniería en Sistemas",
    "fechaEmision": "2024-06-15",
    "institucion": "Universidad Autónoma de Xalapa",
    "hash": "0xabc123",
    "estado": "registrado",
}


def test_incluye_instrucciones_y_pregunta():
    prompt = construir_prompt([CERTIFICADO], "¿de qué carrera es?")

    assert SYSTEM_INSTRUCTIONS in prompt
    assert "¿de qué carrera es?" in prompt


def test_incluye_los_campos_del_certificado():
    prompt = construir_prompt([CERTIFICADO], "pregunta")

    assert "Certificado #1" in prompt
    assert "Carlos Mendoza Ríos" in prompt
    assert "Ingeniería en Sistemas" in prompt
    assert "Universidad Autónoma de Xalapa" in prompt
    assert "UAX-2024-0847-MENG" in prompt


def test_numera_varios_certificados_en_orden():
    prompt = construir_prompt([CERTIFICADO, CERTIFICADO], "pregunta")

    assert "Certificado #1" in prompt
    assert "Certificado #2" in prompt


def test_omite_campos_vacios_sin_romper():
    incompleto = {"nombreEstudiante": "Ana", "carrera": None}

    prompt = construir_prompt([incompleto], "pregunta")

    assert "Estudiante: Ana" in prompt
    assert "Carrera:" not in prompt
