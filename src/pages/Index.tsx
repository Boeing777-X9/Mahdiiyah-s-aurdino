import { useState } from "react";
import { useSerial, useDemoMode, type SensorData } from "@/hooks/useSerial";
import {
  Activity,
  AlertTriangle,
  Car,
  Droplets,
  Eye,
  Gauge,
  MonitorSpeaker,
  Radio,
  RotateCcw,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

// ─── Gauge Component ───
function RadialGauge({
  value,
  max,
  label,
  unit,
  dangerThreshold,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  dangerThreshold: number;
}) {
  const pct = Math.min(value / max, 1);
  const offset = 251 - pct * 251;
  const isDanger = value >= dangerThreshold;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
        <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.3" />
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke={isDanger ? "hsl(var(--danger))" : "hsl(var(--safe))"}
          strokeWidth="6"
          className="gauge-ring"
          style={{ strokeDashoffset: offset }}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" textAnchor="middle" className="font-mono-tech" fill="currentColor" fontSize="22" fontWeight="700">
          {value}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
          {unit}
        </text>
      </svg>
      <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Status Badge ───
function StatusBadge({ status }: { status: SensorData["status"] }) {
  const config: Record<string, { label: string; classes: string }> = {
    safe: { label: "ALL CLEAR", classes: "bg-safe/20 text-safe glow-green" },
    alcohol: { label: "ALCOHOL!", classes: "bg-danger/20 text-danger glow-red animate-alert-pulse" },
    tilt: { label: "TILT!", classes: "bg-warning/20 text-warning glow-yellow animate-alert-pulse" },
    ir: { label: "IR OBSTACLE!", classes: "bg-danger/20 text-danger glow-red animate-alert-pulse" },
    obstacle: { label: "TOO CLOSE!", classes: "bg-danger/20 text-danger glow-red animate-alert-pulse" },
  };
  const c = config[status] || config.safe;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-5 py-2 font-display text-sm font-bold tracking-wider ${c.classes}`}>
      {status === "safe" ? <Zap size={16} /> : <AlertTriangle size={16} />}
      {c.label}
    </div>
  );
}

// ─── Sensor Card ───
function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`sensor-card rounded-lg border bg-card p-4 ${
        alert ? "border-danger/50 glow-red" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon size={14} />
        <span className="text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className="font-mono-tech text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const [mode, setMode] = useState<"demo" | "serial">("demo");
  const serial = useSerial();
  const demo = useDemoMode();

  const isSerial = mode === "serial";
  const data = isSerial ? serial.sensorData : demo.sensorData;
  const alerts = isSerial ? serial.alertLog : demo.alertLog;
  const connected = isSerial ? serial.connected : true;

  const serialSupported = typeof navigator !== "undefined" && "serial" in navigator;

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="relative border-b bg-card/80 backdrop-blur-md scanline-effect overflow-hidden">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Car className="text-primary" size={28} />
            <div>
              <h1 className="text-lg font-bold tracking-wider">ADAS MONITOR</h1>
              <p className="text-xs text-muted-foreground tracking-wide">Advanced Driver Assistance System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode toggle */}
            <div className="flex rounded-md border bg-secondary/50 text-xs">
              <button
                onClick={() => setMode("demo")}
                className={`px-3 py-1.5 rounded-l-md transition-colors ${
                  mode === "demo" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Demo
              </button>
              <button
                onClick={() => {
                  setMode("serial");
                  if (!serial.connected && serialSupported) serial.connect();
                }}
                className={`px-3 py-1.5 rounded-r-md transition-colors ${
                  mode === "serial" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Serial
              </button>
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-2 text-xs">
              {connected ? (
                <>
                  <div className="status-dot bg-safe blink" />
                  <Wifi size={14} className="text-safe" />
                </>
              ) : (
                <>
                  <div className="status-dot bg-danger" />
                  <WifiOff size={14} className="text-danger" />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <StatusBadge status={data.status} />
          <div className="font-mono-tech text-xs text-muted-foreground">
            {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Gauges Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          <RadialGauge value={data.alcohol} max={1023} label="Alcohol (MQ3)" unit="raw" dangerThreshold={400} />
          <RadialGauge value={data.distance} max={400} label="Distance" unit="cm" dangerThreshold={999} />
          <RadialGauge value={data.motorSpeed} max={255} label="Motor Speed" unit="PWM" dangerThreshold={999} />
          <RadialGauge
            value={data.status === "safe" ? 100 : 0}
            max={100}
            label="Safety Score"
            unit="%"
            dangerThreshold={999}
          />
        </div>

        {/* Sensor Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SensorCard icon={Droplets} label="Alcohol" value={data.alcohol} unit="/ 1023" alert={data.alcohol > 400} />
          <SensorCard icon={Gauge} label="Distance" value={data.distance} unit="cm" alert={data.distance <= 15} />
          <SensorCard icon={Eye} label="IR Left" value={data.ir ? "BLOCKED" : "CLEAR"} alert={data.ir} />
          <SensorCard icon={RotateCcw} label="Tilt" value={data.tilt ? "TILTED" : "STABLE"} alert={data.tilt} />
        </div>

        {/* Bottom: LED status + Alert log */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* LED & Motor */}
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MonitorSpeaker size={14} /> Outputs
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full transition-colors ${
                    data.status !== "safe" ? "bg-danger animate-alert-pulse" : "bg-muted"
                  }`}
                />
                <span className="text-[10px] text-muted-foreground">RED</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full transition-colors ${
                    data.status === "safe" ? "bg-safe" : "bg-muted"
                  }`}
                />
                <span className="text-[10px] text-muted-foreground">GREEN</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full border-2 transition-colors flex items-center justify-center text-[10px] font-mono-tech ${
                    data.status !== "safe" ? "border-warning text-warning animate-alert-pulse" : "border-muted text-muted-foreground"
                  }`}
                >
                  BZR
                </div>
                <span className="text-[10px] text-muted-foreground">BUZZER</span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Motor</span>
                <span className="font-mono-tech">{data.motorSpeed} PWM</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all alcohol-bar"
                  style={{ width: `${(data.motorSpeed / 255) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alert Log */}
          <div className="md:col-span-2 rounded-lg border bg-card p-5">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
              <Activity size={14} /> Alert Log
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No alerts yet</p>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 py-1.5">
                    <span className={a.type === "safe" ? "text-safe" : "text-danger"}>{a.message}</span>
                    <span className="font-mono-tech text-muted-foreground">{a.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <details className="rounded-lg border bg-card p-5">
          <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Radio size={14} /> Arduino Connection Guide
          </summary>
          <div className="mt-4 space-y-3 text-sm text-secondary-foreground leading-relaxed">
            <p className="font-semibold text-foreground">To connect your Arduino to this dashboard:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Add Serial output to your Arduino code.</strong> In the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono-tech">loop()</code> function, add this line before the conditions block:
                <pre className="mt-2 bg-muted p-3 rounded text-xs font-mono-tech overflow-x-auto">
{`Serial.begin(9600); // Add in setup()

// Add in loop(), before the conditions:
Serial.print("A:"); Serial.print(alcohol);
Serial.print(" D:"); Serial.print(dist);
Serial.print(" IR:"); Serial.print(ir);
Serial.print(" TILT:"); Serial.print(tilt);
Serial.print(" SPD:"); Serial.print(180); // or 0 if stopped
Serial.print(" ST:");
// Print status based on your condition:
if (alcohol > 400) Serial.println("alcohol");
else if (tilt == HIGH) Serial.println("tilt");
else if (ir == LOW) Serial.println("ir");
else if (dist <= 15) Serial.println("obstacle");
else Serial.println("safe");`}
                </pre>
              </li>
              <li>
                <strong className="text-foreground">Upload</strong> the updated code to your Arduino.
              </li>
              <li>
                <strong className="text-foreground">Open this dashboard</strong> in <strong>Google Chrome</strong> (Web Serial API required).
              </li>
              <li>
                Click <strong className="text-foreground">"Serial"</strong> in the top-right toggle, then select your Arduino's COM port from the browser prompt.
              </li>
              <li>
                The dashboard will start showing <strong className="text-foreground">live sensor data</strong> from your Arduino!
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
              ⚡ <strong>Note:</strong> Web Serial API is only supported in Chromium browsers (Chrome, Edge, Opera). Make sure no other program (like Arduino IDE Serial Monitor) is using the COM port.
            </p>
          </div>
        </details>
      </main>
    </div>
  );
}
