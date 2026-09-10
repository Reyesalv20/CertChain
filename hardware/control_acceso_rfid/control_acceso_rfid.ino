/*
  Lector RFID por Bluetooth (ESP32-C5 + RC522 + OLED + Buzzer)
  --------------------------------------------------------------
  El ESP32 se anuncia como periférico BLE ("CertChain-RFID"). Cuando el
  navegador (Web Bluetooth, ver frontend/lib/bluetooth.ts) se conecta y
  suscribe la característica, cada tarjeta leída se manda por notify().
  Si nadie está conectado, igual se lee y se muestra localmente (OLED +
  buzzer), solo que avisa "Sin Bluetooth" en vez de "Enviado".

  UID: se envía en formato canónico (mayúsculas, sin separadores) — igual
  que credenciales_fisicas.uid_rfid / normalizarUid() del backend.

  Librerias necesarias (Arduino IDE > Administrar bibliotecas):
    - MFRC522 (por GithubCommunity / miguelbalboa)
    - Adafruit SSD1306
    - Adafruit GFX Library
    - ESP32 BLE Arduino (viene con el core de ESP32; si el C5 no la soporta,
      probar como alternativa NimBLE-Arduino)

  NOTA: sin pin RST del RC522 — se inicializa con UINT8_MAX (sin reset por
  software) y el pin RST del módulo queda sin conexión (flotando).

  *** AVISO (ESP32-C5) ***
  GPIO2 y GPIO7 son pines de "strapping" (modo de arranque) en el ESP32-C5.
  Si la placa no bootea, entra en bucle de reinicio, o el puerto no aparece
  en Arduino IDE al conectar por USB, sospechar primero del buzzer (GPIO2) y
  del MOSI del RC522 (GPIO7).
*/

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---------- Pines RC522 (SPI) ----------
#define RC522_SS    4   // CS / SDA
#define RC522_MISO  5
#define RC522_MOSI  7   // pin de "strapping" en el C5 — ver aviso arriba
#define RC522_SCK   6

// ---------- Pines OLED (I2C) ----------
#define OLED_SDA    8
#define OLED_SCL    9
#define OLED_WIDTH  128
#define OLED_HEIGHT 32     // cambia a 64 si tu pantalla 0.91" es 128x64
#define OLED_ADDR   0x3C

// ---------- Buzzer pasivo ----------
#define BUZZER_PIN  2   // pin de "strapping" en el C5 — ver aviso arriba

// ---------- Bluetooth (BLE) ----------
#define BLE_DEVICE_NAME       "CertChain-RFID"
#define SERVICE_UUID          "6f1e0001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID   "6f1e0002-b5a3-f393-e0a9-e50e24dcca9e"

MFRC522 rfid(RC522_SS, UINT8_MAX);  // sin pin RST
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool dispositivoConectado = false;

// ---------- Control de lecturas repetidas ----------
String ultimoUid = "";
unsigned long ultimaLectura = 0;
const unsigned long TIEMPO_ANTIRREBOTE = 2000; // ms

// ---------- Historial (solo en RAM, para depurar por Serial) ----------
#define MAX_HISTORIAL 50
String historial[MAX_HISTORIAL];
int totalHistorial = 0;

// ---------- Prototipos (se llaman desde MisCallbacksServidor, definida
// antes que ellas) ----------
void mostrarEscaneando();
void mostrarResultado(String uid, bool enviado);

// ---------- Callbacks de conexion BLE ----------
class MisCallbacksServidor : public BLEServerCallbacks {
  void onConnect(BLEServer* server) {
    dispositivoConectado = true;
    Serial.println(F("Navegador conectado por Bluetooth."));
    mostrarEscaneando();
  }
  void onDisconnect(BLEServer* server) {
    dispositivoConectado = false;
    Serial.println(F("Navegador desconectado."));
    server->getAdvertising()->start();  // vuelve a anunciarse
    mostrarEscaneando();
  }
};

void beep(int freq = 2000, int dur = 120) {
  tone(BUZZER_PIN, freq, dur);
}

// UID en formato canónico: mayúsculas, sin separadores (igual que
// normalizarUid() en el backend).
String leerUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void guardarHistorial(String uid) {
  if (totalHistorial < MAX_HISTORIAL) {
    historial[totalHistorial++] = uid;
  } else {
    for (int i = 1; i < MAX_HISTORIAL; i++) historial[i - 1] = historial[i];
    historial[MAX_HISTORIAL - 1] = uid;
  }
  Serial.print("Historial (");
  Serial.print(totalHistorial);
  Serial.print("): ");
  Serial.println(uid);
}

void mostrarEscaneando() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Escaneando...");
  display.setCursor(0, 16);
  display.print(dispositivoConectado ? "Bluetooth: OK" : "Sin Bluetooth");
  display.display();
}

void mostrarResultado(String uid, bool enviado) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(enviado ? "Enviado:" : "Sin Bluetooth:");
  display.setCursor(0, 16);
  display.println(uid);
  display.display();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);

  // SPI con pines personalizados: SCK, MISO, MOSI, SS
  SPI.begin(RC522_SCK, RC522_MISO, RC522_MOSI, RC522_SS);
  rfid.PCD_Init();

  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("Error iniciando el OLED");
    while (true) delay(10);
  }
  display.setTextColor(SSD1306_WHITE);

  // ---------- Bluetooth ----------
  BLEDevice::init(BLE_DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MisCallbacksServidor());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.print("BLE listo. Anunciándose como: ");
  Serial.println(BLE_DEVICE_NAME);

  mostrarEscaneando();
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }

  String uid = leerUID();
  unsigned long ahora = millis();

  // Antirrebote: ignora la misma tarjeta si se leyó hace menos de 2s
  // (queda pegada sobre el lector).
  if (uid == ultimoUid && (ahora - ultimaLectura) < TIEMPO_ANTIRREBOTE) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(50);
    return;
  }
  ultimoUid = uid;
  ultimaLectura = ahora;

  beep();
  guardarHistorial(uid);

  bool enviado = false;
  if (dispositivoConectado) {
    pCharacteristic->setValue(uid.c_str());
    pCharacteristic->notify();
    enviado = true;
    Serial.print("UID enviado por Bluetooth: ");
  } else {
    Serial.print("UID leído (sin Bluetooth conectado): ");
  }
  Serial.println(uid);

  mostrarResultado(uid, enviado);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  delay(1500);          // tiempo mostrando el resultado en pantalla
  mostrarEscaneando();  // vuelve al estado de reposo
}
