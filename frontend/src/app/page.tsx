"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";

import { connectToDevice, readCharacteristicValue } from "./utils/BLEfunctions";
import { setDoc, doc } from "firebase/firestore";
import { db } from "./utils/firebaseConfig";
import { HealthChart } from "./utils/HealthChart";
import { Eye, EyeOff } from "lucide-react";

export default function Home() {
  // global consts - 수정하지 말 것
  const deviceName: string = "MIRAS";
  const optionalServiceUUID: string = "3843D836-4F99-346C-B334-CCC8E9DFAFAB";
  const optionalCharacteristicUUID: string = "3843D836-4F99-346C-B334-CCC8E9DFAFAB";

  // STATE HOOKS
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [timeConnected, setTimeConnected] = useState<Date>();
  const [sensorData, setSensorData] = useState<
    { timestamp: number; values: number[] }[]
  >([]);
  const [showChart, setShowChart] = useState<boolean>(true);
  const MAX_CHART_BUFFER_SIZE = 500;

  // TEST 인터페이스
  interface NotificationEntry {
    timestamp: number;
    data: number[];
  }
  const notificationBuffer: NotificationEntry[] = [];

  async function handleScan() {
    try {
      const characteristic = await connectToDevice(
        deviceName,
        optionalServiceUUID,
        optionalCharacteristicUUID
      );

      // BLE 연결 상태 확인
      const bluetoothDevice = characteristic.service.device;
      setDevice(bluetoothDevice);
      if (bluetoothDevice.gatt && bluetoothDevice.gatt.connected) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }

      bluetoothDevice.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setDevice(null);
      });
      
      // 데이터 알림 수신
      const connectionTime = new Date();
      const notifications = await readCharacteristicValue(characteristic);
      notifications.addEventListener("characteristicvaluechanged", event => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (!value) return;
        
        // DataView를 문자열로 변환
        const decoder = new TextDecoder("utf-8");
        const dataString = decoder.decode(value);
        // 12채널 데이터 배열로 파싱
        const data = dataString.split(",").map(num => parseInt(num, 10));
       
        const timestamp = Date.now() - connectionTime.getTime();

        setSensorData(prevData => {
          const newData = [...prevData, { timestamp, values: data }];
          if (newData.length > MAX_CHART_BUFFER_SIZE) {
            return newData.slice(newData.length - MAX_CHART_BUFFER_SIZE);
          }
          return newData;
        });

        notificationBuffer.push({ timestamp, data });
        // console.log(`Buffered notification at ${new Date(timestamp).toISOString()}:`, data);
      });
    } catch (error: any) {
      setErrorMessage(error.message);
      toast.error(error.message);
    }
  }

  async function firebaseSend(buffer: NotificationEntry[]): Promise<void> {
    // 배치 데이터 패키지 구성
    const batchData = {
      batchTimestamp: Date.now(),
      notifications: buffer,
    };

    try {
      const currentDate = new Date().toISOString();
      const docRef = doc(db, "MIRASdata", currentDate);
      await setDoc(docRef, batchData);
      // console.log("Batch data sent to Firebase with ID:", docRef.id);
    } catch (error) {
      console.error("Error sending data to Firebase:", error);
      throw error;
    }
  }

  async function sendBatchToFirebase(buffer: NotificationEntry[]) {
    try {
      await firebaseSend(buffer);
      // console.log("Sent batch to Firebase:", buffer);
    } catch (err) {
      console.error("Error sending batch to Firebase:", err);
    }
  }

  // useEffect로 interval 설정 (컴포넌트 마운트 시 한 번만 실행)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (notificationBuffer.length > 0) {
        sendBatchToFirebase([...notificationBuffer]);
        notificationBuffer.length = 0;
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <div>
        <Link href="/data"></Link>
      </div>
      <Card className="mx-auto w-11/12 h-full">
        <CardHeader>
          <CardTitle style={{ fontSize: "30px" }}>
            MIRAS Connection
          </CardTitle>
          <CardDescription style={{ fontSize: "16px" }}>
            <p>Connect to your device via BLE</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div>
            <p>Ensure that the device is powered on and in pairing mode</p>
            <p className="flex justify-center text-lg text-gray-700">
              {isConnected ? `Connected to: ${"MIRAS"}` : "No device connected"}
            </p>
          </div>
          <div className="flex justify-center mb-40 space-x-2 items-center">
            <span
              className={`inline-block flex justify-center py-2 px-4 rounded-full text-white ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <Button
              onClick={() => setShowChart(prev => !prev)}
              className="bg-gray-700 text-white py-2 px-4 border-2 border-gray-700 hover:bg-gray-600 transition-all duration-300"
            >
              {showChart ? <Eye /> : <EyeOff />}
            </Button>
          </div>
          {showChart && sensorData.length !== 0 && (
            <HealthChart data={sensorData} />
          )}
          <div></div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div>
            <Button
              onClick={handleScan}
              disabled={isConnected}
              className="bg-black text-white py-2 px-6 border-2 border-black hover:text-black transition-all duration-300"
            >
              {isConnected ? "Reconnect" : "Connect to MIRAS"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
