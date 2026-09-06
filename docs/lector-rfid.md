# Lector RFID → backend → frontend (ESP32)

Cómo una credencial física (RFID) leída con un **ESP32 + RC522** se convierte en
una verificación con pantalla física o en datos que el frontend captura solo.

## Arquitectura

```
Tarjeta ──> [ESP32 + RC522 + OLED]  (1 ESP, 2 modos por botón)
   │
   ├─ MODE VINCULAR ──> POST /reader/uid {"uid":"04A224B2"}
   │                        │ normaliza y difunde (SSE)
   │                        ▼
   │              GET /reader/events  ◄── EventSource ── /verificar, alta de credencial
   │
   └─ MODE VERIFICAR ──> GET /lector/tarjeta/:uid
                             │ por-rfid (credencial + certs)  +  por cada hash →
                             ▼ blockchain-service POST /verifyCertificate
                     JSON con certificados + estado on-chain → OLED
```

`blockchain-service` corre aparte (anvil + blockchain-server). El backend
(port 4000) le pregunta con `BLOCKCHAIN_SERVICE_URL` (ver `.env.example`).

## Endpoints nuevos (backend Nest)

| Método | Ruta | Uso | Auth |
|---|---|---|---|
| POST | `/reader/uid` | el ESP informa un UID leído (`{uid}` o `?uid=`) | pública (kiosko) |
| GET | `/reader/events` | SSE: difunde cada UID a las páginas web | pública (CORS) |
| GET | `/lector/tarjeta/:uid` | kiosko: credencial + certs con verificación on-chain | pública |

### Formato canónico del UID
El backend normaliza todo UID a **mayúsculas sin separadores** (`0x`, espacios,
dos puntos, guiones) — igual que `credenciales_fisicas.uid_rfid`.
Ej.: `0x04 A2:24-B2` → `04A224B2`. Lector y web deben guardar siempre ese formato.

### `/lector/tarjeta/:uid`
Respuesta compacta para la pantalla (ver `rfid-lector/`):

```json
{ "valido": true,
  "credencial": { "uid": "04A224B2", "codigo": null },
  "cantidad": 1,
  "certificados": [
    { "nombreEstudiante": "…", "carrera": "…", "codigo": "…",
      "institucion": "…", "estado": "registrado", "hash": "0x…",
      "onChain": { "exists": true, "isRevoked": false, "valid": true, "issuer": "0x…" } }
  ] }
```

- `onChain: null` → blockchain-service no disponible (se muestra "sin verificar").
- `valido: false` + `mensaje` → no existe credencial para ese UID.

## Cómo recibe el UID el frontend

`hooks/useLectorRfid.ts` abre `EventSource(<BACKEND_URL>/reader/events)` y expone
`{ escuchando, conectado }` + callback `onUid(uid)`. Pantallas integradas:

- `/verificar` (modo **Por tarjeta RFID**): al escanear, verifica solo.
- `/admin/credenciales` (alta): el UID se prellena en el formulario.
- `/admin/credenciales/[id]`: el UID se prellena al editar.

Probá sin el ESP:

```bash
# terminal 1: escuchar
curl -N http://localhost:4000/reader/events
# terminal 2: simular un escaneo
curl -X POST http://localhost:4000/reader/uid -H 'Content-Type: application/json' -d '{"uid":"04A224B2"}'
```

## Firmware (rfid-lector/lector-rfid.ino)

Ejemplo de referencia: 2 modos por botón, RC522 (SPI) + OLED (I2C), WiFi.
Ver `rfid-lector/README.md` para librerías y configuración.

**Importante en dev local:** el ESP **no** puede usar `http://localhost:4000`
(apuntaría a sí mismo). Usá la **IP LAN** del equipo donde corre el backend, que
escucha en `0.0.0.0:4000` (ej. `http://192.168.1.50:4000`). Si el backend corre
en Docker, usá el puerto mapeado del contenedor.

## Feature opcional: grabar el link de verificación en la tarjeta (NDEF)

Idea: al acercar la tarjeta a un celular, este abre automáticamente
`https://<host>/verificar?card_id=<UID>` (el front ya soporta `?card_id=` y
auto-verifica al entrar).

**Limitación de hardware (importante):**
- El celular solo interpreta **NDEF** si la tarjeta es de tipo
  **NTAG21x / MIFARE Ultralight** (o similar ISO14443A con memoria NDEF).
- Las tarjetas **MIFARE Classic** (las azules típicas del kit RC522) **no** las
  abren los celulares como NDEF — solo las lee un lector RFID/RC522.
- Para escribir NDEF conviene un **PN532** (o RC522 únicamente con tags
  Ultralight/NTAG).

Cómo detectar si la tarjeta sirve (firmware): el `PICC_GetTypeName` del MFRC522
reporta `MIFARE UL`/`NTAG…` para las compatibles; si reporta `MIFARE 1K`, no es
NDEF. Escritura NDEF con PN532 (ejemplo conceptual, requiere
`Adafruit_PN532` + `NDEF`):

```cpp
// ReadUID → NdefMessage con record URL "https://<host>/verificar?card_id=<UID>"
NdefMessage msg = NdefMessage();
NdefRecord urlRecord = NdefRecord();
urlRecord.setTnf(TNF_MIME_MEDIA);            // o TNF para URL según librería
urlRecord.setType("U");
urlRecord.setPayload("https://HOST/verificar?card_id=" + uid);
msg.addRecord(urlRecord);
nfc.writeNdefMessage(msg);                    // tag debe ser NDEF-capaz
```

Si la tarjeta es MIFARE Classic, la alternativa es verificar desde el lector
(modo VERIFICAR) o una app, nunca NDEF del celular.

## Troubleshooting

- **El ESP no responde al backend en local**: usá la IP LAN, no `localhost`.
- **SSE no llega al front**: backend debe correr con CORS que permita el origen
  del front (`FRONTEND_ORIGIN`, default `http://localhost:3000`). El POST del ESP
  no manda `Origin`, así que no le aplica CORS.
- **`/lector/tarjeta` muestra `onChain: null`**: blockchain-service/anvil no
  está corriendo o `BLOCKCHAIN_SERVICE_URL` apunta mal.
- **UID que no matchea**: asegurate del formato canónico (mayúsculas, sin
  separadores) tanto al registrar la credencial como al comparar.
- **Backend no toma archivos nuevos** (`dist` viejo): borrar `backend/dist` y
  reiniciar `npm run start:dev`.

## Seguridad (para producción, fuera del demo)
- Los endpoints `/reader/*` y `/lector/*` son públicos para el kiosko. Para
  producción agregar un token compartido (`X-Lector-Token`) en el POST y
  limitar por IP/red; el kiosko solo debería poder consultar credenciales cuyo
  `estado` corresponda (hoy devuelve el estado DB tal cual).
