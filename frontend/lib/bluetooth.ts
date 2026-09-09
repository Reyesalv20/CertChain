// Puente Web Bluetooth <-> ESP32-C5 (lector RFID por BLE).
//
// El ESP32 se anuncia como periférico BLE ("CertChain-RFID") con una sola
// característica que notifica el UID en texto plano cada vez que lee una
// tarjeta. Esta función hace de "central": pide al usuario elegir el
// dispositivo (gesto obligatorio del navegador), conecta el GATT y suscribe
// la notificación.
//
// Solo funciona en navegadores con Web Bluetooth (Chrome/Edge de escritorio
// y Android) y requiere contexto seguro (https o localhost).

export const BLE_DEVICE_NAME = 'CertChain-RFID';
export const BLE_SERVICE_UUID = '6f1e0001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_CHARACTERISTIC_UUID = '6f1e0002-b5a3-f393-e0a9-e50e24dcca9e';

export function bluetoothDisponible(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

// Mismo formato canónico que usa el backend (normalizarUid): mayúsculas, sin
// separadores. El ESP32 ya lo manda así, pero normalizamos igual por si acaso.
function normalizarUid(valor: string): string {
  return valor
    .trim()
    .replace(/^0x/i, '')
    .replace(/[\s:;,._/-]/g, '')
    .toUpperCase();
}

export interface ConexionBluetoothRfid {
  device: BluetoothDevice;
  desconectar(): void;
}

export async function conectarLectorRfid(
  onUid: (uid: string) => void,
  onDesconectado: () => void,
): Promise<ConexionBluetoothRfid> {
  if (!bluetoothDisponible()) {
    throw new Error('Este navegador no soporta Web Bluetooth. Usa Chrome o Edge en una computadora.');
  }

  const device = await navigator.bluetooth!.requestDevice({
    filters: [{ name: BLE_DEVICE_NAME }],
    optionalServices: [BLE_SERVICE_UUID],
  });

  const gatt = device.gatt;
  if (!gatt) throw new Error('El dispositivo seleccionado no soporta GATT.');

  const server = await gatt.connect();
  const service = await server.getPrimaryService(BLE_SERVICE_UUID);
  const characteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_UUID);
  await characteristic.startNotifications();

  const handler = (ev: Event) => {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    const texto = new TextDecoder('utf-8').decode(value.buffer);
    const uid = normalizarUid(texto);
    if (uid) onUid(uid);
  };

  characteristic.addEventListener('characteristicvaluechanged', handler);
  device.addEventListener('gattserverdisconnected', onDesconectado);

  return {
    device,
    desconectar() {
      characteristic.removeEventListener('characteristicvaluechanged', handler);
      device.removeEventListener('gattserverdisconnected', onDesconectado);
      if (gatt.connected) gatt.disconnect();
    },
  };
}
