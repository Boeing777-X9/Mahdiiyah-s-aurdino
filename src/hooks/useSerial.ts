import { useState, useCallback, useRef, useEffect } from "react";

export interface SensorData {
  alcohol: number;
  distance: number;
  ir: boolean;       // true = obstacle detected (LOW signal)
  tilt: boolean;     // true = tilt detected (HIGH signal)
  motorSpeed: number;
  status: "safe" | "alcohol" | "tilt" | "ir" | "obstacle";
  timestamp: number;
}

const DEFAULT_DATA: SensorData = {
  alcohol: 0,
  distance: 999,
  ir: false,
  tilt: false,
  motorSpeed: 0,
  status: "safe",
  timestamp: Date.now(),
};

export function useSerial() {
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_DATA);
  const [alertLog, setAlertLog] = useState<{ message: string; time: string; type: string }[]>([]);
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const bufferRef = useRef("");

  const addAlert = useCallback((message: string, type: string) => {
    const time = new Date().toLocaleTimeString();
    setAlertLog((prev) => [{ message, time, type }, ...prev].slice(0, 50));
  }, []);

  const parseLine = useCallback(
    (line: string) => {
      // Expected format from Arduino: "A:350 D:45 IR:1 TILT:0 SPD:180 ST:safe"
      try {
        const parts: Record<string, string> = {};
        line.split(" ").forEach((p) => {
          const [k, v] = p.split(":");
          if (k && v) parts[k.trim()] = v.trim();
        });

        const alcohol = parseInt(parts["A"] || "0", 10);
        const distance = parseInt(parts["D"] || "999", 10);
        const ir = parts["IR"] === "0"; // LOW = obstacle
        const tilt = parts["TILT"] === "1";
        const motorSpeed = parseInt(parts["SPD"] || "0", 10);
        const statusRaw = parts["ST"] || "safe";
        const status = (["safe", "alcohol", "tilt", "ir", "obstacle"].includes(statusRaw)
          ? statusRaw
          : "safe") as SensorData["status"];

        const data: SensorData = { alcohol, distance, ir, tilt, motorSpeed, status, timestamp: Date.now() };
        setSensorData(data);

        if (status !== "safe") {
          const msgs: Record<string, string> = {
            alcohol: "⚠ ALCOHOL DETECTED",
            tilt: "⚠ TILT DETECTED",
            ir: "⚠ LEFT OBSTACLE",
            obstacle: "⚠ OBJECT TOO CLOSE",
          };
          addAlert(msgs[status] || "⚠ ALERT", status);
        }
      } catch {
        // ignore bad lines
      }
    },
    [addAlert]
  );

  const connect = useCallback(async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setConnected(true);

      const decoder = new TextDecoderStream();
      port.readable?.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      // Read loop
      (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bufferRef.current += value;
          const lines = bufferRef.current.split("\n");
          bufferRef.current = lines.pop() || "";
          lines.forEach((l) => {
            if (l.trim()) parseLine(l.trim());
          });
        }
      })();
    } catch (err) {
      console.error("Serial connect failed:", err);
    }
  }, [parseLine]);

  const disconnect = useCallback(async () => {
    readerRef.current?.cancel();
    await portRef.current?.close();
    portRef.current = null;
    setConnected(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      readerRef.current?.cancel();
      portRef.current?.close().catch(() => {});
    };
  }, []);

  return { connected, sensorData, alertLog, connect, disconnect };
}

// Demo mode hook - simulates sensor data
export function useDemoMode() {
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_DATA);
  const [alertLog, setAlertLog] = useState<{ message: string; time: string; type: string }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const alcohol = Math.floor(Math.random() * 500);
      const distance = Math.floor(Math.random() * 200) + 5;
      const ir = Math.random() > 0.9;
      const tilt = Math.random() > 0.95;

      let status: SensorData["status"] = "safe";
      if (alcohol > 400) status = "alcohol";
      else if (tilt) status = "tilt";
      else if (ir) status = "ir";
      else if (distance <= 15) status = "obstacle";

      const data: SensorData = {
        alcohol,
        distance,
        ir,
        tilt,
        motorSpeed: status === "safe" ? 180 : 0,
        status,
        timestamp: Date.now(),
      };
      setSensorData(data);

      if (status !== "safe") {
        const time = new Date().toLocaleTimeString();
        const msgs: Record<string, string> = {
          alcohol: "⚠ ALCOHOL DETECTED",
          tilt: "⚠ TILT DETECTED",
          ir: "⚠ LEFT OBSTACLE",
          obstacle: "⚠ OBJECT TOO CLOSE",
        };
        setAlertLog((prev) => [{ message: msgs[status], time, type: status }, ...prev].slice(0, 50));
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return { sensorData, alertLog };
}
