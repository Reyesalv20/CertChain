# Contrato propuesto — llm-service ↔ backend (flujo RFID)

`llm-service` ya expone `POST /chat/llama3` y `POST /chat/mistral` para el
flujo "alguien escanea un RFID y pregunta algo sobre su(s) certificado(s)".
Para responder con contexto real (no inventado), necesita poder consultar,
dado un `uid_rfid`, todos los certificados asociados a esa credencial física.

Ese endpoint **todavía no existe en `backend`**. Mientras tanto,
`llm-service` responde con datos de prueba (`MOCK_CERTIFICADOS=true`, ver
`app/certificados_client.py`) para poder probar el flujo completo de punta a
punta sin bloquear a nadie.

## Endpoint propuesto

### `GET /certificados/por-rfid/:uid`

Dado el `uid_rfid` de `credenciales_fisicas`, devuelve los certificados
asociados a esa credencial (vía la tabla intermedia
`certificados_credenciales`), con la institución ya resuelta.

Respuesta 200:
```json
{
  "uidRfid": "04A224B2",
  "certificados": [
    {
      "id": "1",
      "codigo": "UAX-2024-0847-MENG",
      "nombreEstudiante": "Carlos Mendoza Ríos",
      "carrera": "Ingeniería en Sistemas",
      "fechaEmision": "2024-06-15",
      "institucion": "Universidad Autónoma de Xalapa",
      "hash": "0xabc123...",
      "estado": "registrado"
    }
  ]
}
```

Respuesta 404 si el `uid_rfid` no existe en `credenciales_fisicas`:
```json
{ "message": "Credencial no encontrada" }
```

El shape de cada certificado es **el mismo** que ya devuelve
`GET /certificados/verificar` en `frontend/API_CONTRACT.md`, para no
inventar un formato nuevo — la única diferencia es que acá puede venir más
de uno (una credencial física puede tener varios certificados asociados,
según el ERD: `certificados_credenciales` es una tabla intermedia
muchos-a-muchos).

## Qué hace falta

- [ ] Backend implementa `GET /certificados/por-rfid/:uid` con este contrato
      (o lo ajustan entre ambos si hace falta cambiar algo).
- [ ] `llm-service`: cuando el endpoint exista, poner `MOCK_CERTIFICADOS=false`
      en el `.env` y borrar `_MOCK_DB` de `app/certificados_client.py`.
- [ ] Confirmar `CERTIFICADOS_SERVICE_URL` (por defecto `http://backend:4000`,
      nombre del servicio en la red de Docker).
