"use client";

/**
 * MIRAS 디바이스를 요청합니다.
 * 이름이 "MIRAS"인 기기를 찾으며, 지정된 서비스 UUID를 사용합니다.
 */
export async function requestMIRASDevice(): Promise<BluetoothDevice> {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser/environment.");
    }
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ name: "MIRAS" }],
            optionalServices: ["3843D836-4F99-346C-B334-CCC8E9DFAFAB"],
        });
        return device;
    } catch (error: any) {
        throw new Error(`Error requesting MIRAS device: ${error.message}`);
    }
}

/**
 * 주어진 BluetoothDevice의 GATT 서버에 연결합니다.
 */
export async function connectGATT(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
    if (!device) {
        throw new Error("No device provided.");
    }
    try {
        const server = await device.gatt!.connect();
        return server;
    } catch (error: any) {
        throw new Error(`Failed to connect to GATT server: ${error.message}`);
    }
}

/**
 * GATT 서버에서 MIRAS 서비스 (지정된 UUID)를 가져옵니다.
 */
export async function getMIRASService(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTService> {
    try {
        const service = await server.getPrimaryService("3843D836-4F99-346C-B334-CCC8E9DFAFAB");
        return service;
    } catch (error: any) {
        throw new Error(`Failed to get MIRAS service: ${error.message}`);
    }
}

/**
 * 지정된 서비스에서 특성을 가져옵니다.
 * 기본값으로 MIRAS 디바이스의 UUID("3843D836-4F99-346C-B334-CCC8E9DFAFAB")를 사용하지만,
 * 만약 특성 UUID가 다르다면 매개변수로 전달하세요.
 */
export async function getMIRASCharacteristic(
    service: BluetoothRemoteGATTService,
    characteristicUUID: number | string = "3843D836-4F99-346C-B334-CCC8E9DFAFAB"
): Promise<BluetoothRemoteGATTCharacteristic> {
    try {
        const characteristic = await service.getCharacteristic(characteristicUUID);
        return characteristic;
    } catch (error: any) {
        throw new Error(`Failed to get MIRAS characteristic: ${error.message}`);
    }
}

/**
 * MIRAS 특성의 알림을 시작하고, 수신된 데이터를 처리합니다.
 */
export async function startMIRASNotifications(
    characteristic: BluetoothRemoteGATTCharacteristic
): Promise<void> {
    try {
        await characteristic.startNotifications();
        console.log("MIRAS notifications started!");

        characteristic.addEventListener("characteristicvaluechanged", event => {
            const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
            // 여기서 데이터를 알맞게 파싱하세요. 예제는 콤마로 구분된 문자열이라고 가정합니다.
            const dataArray = new TextDecoder().decode(value).split(",");
            console.log("Received MIRAS data:", dataArray);
            // 이후 그래프 업데이트 등 추가 처리를 수행하세요.
        });
    } catch (error: any) {
        throw new Error(`Error starting MIRAS notifications: ${error.message}`);
    }
}

/**
 * DataView를 숫자 배열로 변환하는 유틸리티 함수입니다.
 */
export function dataViewToArray(dataView: DataView): number[] {
    const array: number[] = [];
    for (let i = 0; i < dataView.byteLength; i++) {
        array.push(dataView.getUint8(i));
    }
    return array;
}

/**
 * MIRAS 디바이스에 처음부터 연결하고, 알림을 시작하는 전체 과정을 수행합니다.
 * 반환 값은 알림이 시작된 특성입니다.
 */
export async function connectToMIRAS(): Promise<BluetoothRemoteGATTCharacteristic> {
    try {
        const device = await requestMIRASDevice();
        const server = await connectGATT(device);
        const service = await getMIRASService(server);
        const characteristic = await getMIRASCharacteristic(service);
        await startMIRASNotifications(characteristic);
        return characteristic;
    } catch (error: any) {
        throw new Error(`Failed to connect to MIRAS device: ${error.message}`);
    }
}
