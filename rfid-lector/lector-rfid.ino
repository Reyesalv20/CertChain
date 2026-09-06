// CertChain — Lector RFID ESP32 (ejemplo de referencia)
// Dos modos (alternar con botón): VERIFICAR (kiosko con pantalla) y VINCULAR
// (envía el UID al backend para que la web lo capture).
//
// Revisá README.md de esta carpeta y ajustá pines / WiFi / host antes de usar.

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <ArduinoJson.h>

// ── Configuración ────────────────────────────────────────────────
const char *WIFI_SSID = "TU_RED";
const char *WIFI_PASS = "TU_CLAVE";
const char *BACKEND_HOST = "192.168.1.50"; // IP LAN del equipo con el backend
const uint16_t BACKEND_PORT = 4000;

// RC522 (SPI). Ajustá los pines a tu placa.
#define SS_PIN 5
#define RST_PIN 27

// OLED I2C 0.96" (SSD1306, 128x64)
#define OLED_SDA 21
#define OLED_SCL 22

// Botón de modo (pulso corto alterna). GPIO0 suele ser el "BOOT".
#define MODO_BTN 0
#define DEBOUNCE_MS 250

// ── Globals ───────────────────────────────────────────────────────
MFRC522 rfid(SS_PIN, RST_PIN);
U8g2 u8g2(U8G2_R0, U8X8_PIN_NONE, OLED_SDA, OLED_SCL);

bool modoVerificar = true; // true=VERIFICAR, false=VINCULAR
unsigned long ultimoBtn = 0;
String ultimoUid = "";

String uidAString(MFRC522::Uid *uid) {
  String s = "";
  for (byte i = 0; i < uid->size; i++) {
    if (uid->uidByte[i] < 0x10) s += "0";
    s += String(uid->uidByte[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void pantalla(String l1, String l2, String l3, String l4) {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 10, l1.c_str());
  u8g2.drawStr(0, 22, l2.c_str());
  u8g2.drawStr(0, 34, l3.c_str());
  u8g2.drawStr(0, 46, l4.c_str());
  u8g2.sendBuffer();
}

String baseUrl() {
  return "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT);
}

// MODE VINCULAR: manda {"uid":"..."} al backend (SSE -> páginas web).
bool enviarUid(const String &uid) {
  HTTPClient http;
  http.begin(baseUrl() + "/reader/uid");
  http.addHeader("Content-Type", "application/json");
  String body = "{\"uid\":\"" + uid + "\"}";
  int code = http.POST(body);
  bool ok = (code == 200);
  http.end();
  return ok;
}

// MODE VERIFICAR: trae la tarjeta con verificación on-chain.
bool consultarTarjeta(const String &uid, String *resumen) {
  HTTPClient http;
  http.begin(baseUrl() + "/lector/tarjeta/" + uid);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }
  String payload = http.getString();
  http.end();

  StaticJsonDocument<6144> doc;
  if (deserializeJson(doc, payload)) return false;

  if (!doc["valido"].as<bool>()) {
    *resumen = "NO HAY CREDENCIAL\npara UID " + uid;
    return true;
  }

  int cant = doc["cantidad"].as<int>();
  String salida = String(cant) + " certificado(s)\n";
  JsonArray certs = doc["certificados"].as<JsonArray>();
  for (JsonObject c : certs) {
    String nombre = c["nombreEstudiante"] | "?";
    bool onChain = c["onChain"] != nullptr;
    bool valid = onChain && c["onChain"]["valid"].as<bool>();
    String estado = !onChain ? "SIN VERIF" : (valid ? "AUTENTICO" : "REVOCADO/NO");
    salida += estado + " " + nombre.substring(0, 22) + "\n";
  }
  *resumen = salida;
  return true;
}

void leerTarjetaYActuar() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = uidAString(&rfid.uid);
  rfid.PICC_HaltA();
  ultimoUid = uid;

  if (modoVerificar) {
    String resumen;
    bool ok = consultarTarjeta(uid, &resumen);
    pantalla("VERIFICAR", "UID " + uid,
             ok ? resumen.substring(0, 11) : "SIN RESP. BACKEND",
             ok ? resumen.substring(11, 22) : "revisar red/IP");
    // Mostrar más contenido: ir paginando el "resumen" (ver README).
  } else {
    bool ok = enviarUid(uid);
    pantalla("VINCULAR", "UID enviado:", uid, ok ? "OK -> guardalo en la web" : "FALLO backend");
  }
}

void alternarModo() {
  modoVerificar = !modoVerificar;
  pantalla(modoVerificar ? "MODO VERIFICAR" : "MODO VINCULAR",
           "Acerca una credencial",
           "al lector RFID...", "");
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  u8g2.begin();
  pinMode(MODO_BTN, INPUT_PULLUP);

  pantalla("CertChain", "Conectando WiFi...", "", "");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 15000) {
    delay(300);
  }
  if (WiFi.status() == WL_CONNECTED) {
    pantalla("Conectado", WiFi.localIP().toString(), "MODO VERIFICAR", "");
  } else {
    pantalla("SIN WIFI", "revisa SSID/clave", "", "");
  }
}

void loop() {
  // Botón de modo
  if (digitalRead(MODO_BTN) == LOW && millis() - ultimoBtn > DEBOUNCE_MS) {
    ultimoBtn = millis();
    alternarModo();
    while (digitalRead(MODO_BTN) == LOW) delay(50);
  }

  if (WiFi.status() == WL_CONNECTED) {
    leerTarjetaYActuar();
  }
  delay(150);
}
