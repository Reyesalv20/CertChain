// Tipos mínimos de Web Bluetooth (no vienen en lib.dom.d.ts de TypeScript).
// Solo lo que usamos en lib/bluetooth.ts. Todo va dentro de `declare global`
// para que sean tipos ambientales (visibles en todo el proyecto sin import).

export {};

declare global {
  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    readonly value: DataView | null;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(
      type: 'characteristicvaluechanged',
      listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => any,
    ): void;
    removeEventListener(
      type: 'characteristicvaluechanged',
      listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => any,
    ): void;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothDevice extends EventTarget {
    readonly id: string;
    readonly name?: string;
    readonly gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: 'gattserverdisconnected', listener: (this: BluetoothDevice, ev: Event) => any): void;
    removeEventListener(type: 'gattserverdisconnected', listener: (this: BluetoothDevice, ev: Event) => any): void;
  }

  interface RequestDeviceFilter {
    services?: string[];
    name?: string;
    namePrefix?: string;
  }

  interface RequestDeviceOptions {
    filters?: RequestDeviceFilter[];
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface Navigator {
    bluetooth?: Bluetooth;
  }
}
