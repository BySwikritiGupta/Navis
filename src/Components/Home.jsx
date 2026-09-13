import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import {
  Gauge, TrendingUp, Clock, ChevronUp, Satellite, Radio,
  Mountain, ParkingSquare, Trees, Building2, WifiOff, Maximize2, Minimize2,
} from "lucide-react";
import "./Home.css";

// Kartavya Path (India Gate <-> Rashtrapati Bhavan), New Delhi — runs east-west.
// Used illustratively for all five scenarios below (same road, different label).
const ROUTE = [
  [28.6143, 77.1996],
  [28.6141, 77.2103],
  [28.6129, 77.2295],
];
const MAP_CENTER = [28.6136, 77.215];
const ZONE_START = 0.32;
const ZONE_END = 0.58;

const SCENARIOS = [
  { id: "tunnel", label: "Tunnel / underpass", Icon: Mountain, severity: "full", driftMax: 45, note: "GNSS-denied — tunnel section" },
  { id: "parking", label: "Multi-level parking", Icon: ParkingSquare, severity: "full", driftMax: 38, note: "GNSS-denied — parking structure" },
  { id: "forest", label: "Dense forest highway", Icon: Trees, severity: "partial", driftMax: 20, note: "Weak signal — forest canopy" },
  { id: "canyon", label: "Urban canyon", Icon: Building2, severity: "partial", driftMax: 26, note: "Multipath — high-rise reflection" },
  { id: "jamming", label: "Signal jamming", Icon: WifiOff, severity: "full", driftMax: 50, note: "Interference detected" },
];

// --- geometry helpers (planar approximation, fine at this scale) ---
function segLengths(pts) {
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [la1, lo1] = pts[i];
    const [la2, lo2] = pts[i + 1];
    lens.push(Math.hypot(la2 - la1, lo2 - lo1));
  }
  return lens;
}

function pointAtT(pts, lens, total, t) {
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target || i === lens.length - 1) {
      const localT = lens[i] === 0 ? 0 : (target - acc) / lens[i];
      const [la1, lo1] = pts[i];
      const [la2, lo2] = pts[i + 1];
      return { lat: la1 + (la2 - la1) * localT, lng: lo1 + (lo2 - lo1) * localT };
    }
    acc += lens[i];
  }
  return { lat: pts[0][0], lng: pts[0][1] };
}

function bearingAtT(pts, lens, total, t) {
  const a = pointAtT(pts, lens, total, t);
  const b = pointAtT(pts, lens, total, Math.min(1, t + 0.01));
  return (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
}

function vehicleIcon(angle, color) {
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${angle}deg); width:0; height:0;
      border-left:7px solid transparent; border-right:7px solid transparent;
      border-bottom:16px solid ${color}; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Lives inside <MapContainer> so it can access the Leaflet map instance
// and keep it centered on the vehicle while a scenario is running.
function MapFollower({ lat, lng, active }) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    map.panTo([lat, lng], { animate: true, duration: 0.25, easeLinearity: 0.4 });
  }, [lat, lng, active, map]);
  return null;
}

export default function Home() {
  const [progress, setProgress] = useState(0.04);
  const [running, setRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [status, setStatus] = useState("gnss"); // 'gnss' | 'degraded' | 'ins'
  const [drift, setDrift] = useState(3);
  const [speed, setSpeed] = useState(42);
  const rafRef = useRef(null);

  const mapRef = useRef(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize?.(), 250);
  }, [mapExpanded]);

  useEffect(() => {
    if (!mapExpanded) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setMapExpanded(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mapExpanded]);

  const lens = useMemo(() => segLengths(ROUTE), []);
  const total = useMemo(() => lens.reduce((a, b) => a + b, 0), [lens]);

  const pos = pointAtT(ROUTE, lens, total, progress);
  const angle = bearingAtT(ROUTE, lens, total, progress);

  const traveledPts = useMemo(() => {
    const steps = 40;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = (progress * i) / steps;
      const p = pointAtT(ROUTE, lens, total, t);
      pts.push([p.lat, p.lng]);
    }
    return pts;
  }, [progress, lens, total]);

  const zonePts = useMemo(() => {
    const steps = 12;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = ZONE_START + ((ZONE_END - ZONE_START) * i) / steps;
      const p = pointAtT(ROUTE, lens, total, t);
      pts.push([p.lat, p.lng]);
    }
    return pts;
  }, [lens, total]);

  const runScenario = (scenario) => {
    if (running) return;
    setActiveScenario(scenario);
    setRunning(true);
    setProgress(0.04);
  };

  useEffect(() => {
    if (!running) return;
    const step = () => {
      setProgress((p) => {
        const next = p + 0.0018;
        if (next >= 1) {
          setRunning(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  useEffect(() => {
    const inZone = progress >= ZONE_START && progress <= ZONE_END;
    const scenario = activeScenario;

    if (!scenario) {
      setStatus("gnss");
      setDrift(3);
      setSpeed(42 + Math.sin(progress * 40) * 3);
      return;
    }

    if (inZone) {
      setStatus(scenario.severity === "full" ? "ins" : "degraded");
      const depth = (progress - ZONE_START) / (ZONE_END - ZONE_START);
      setDrift(3 + depth * scenario.driftMax);
      setSpeed(52 + Math.sin(progress * 80) * 3);
    } else if (progress > ZONE_END) {
      setStatus("gnss");
      setDrift((d) => Math.max(2, d * 0.85));
      setSpeed(40 + Math.sin(progress * 40) * 3);
    } else {
      setStatus("gnss");
      setDrift(3);
      setSpeed(38 + Math.sin(progress * 40) * 3);
    }
  }, [progress, activeScenario]);

  const zoneColor = activeScenario?.severity === "partial" ? "#D6467F99" : "#D6467F";
  const accent = status === "gnss" ? "#6C4FD6" : status === "degraded" ? "#B8790A" : "#D6467F";
  const badgeText =
    status === "gnss" ? "GNSS locked" : status === "degraded" ? "GNSS degraded" : "Inertial nav";
  const StatusIcon = status === "gnss" ? Satellite : status === "degraded" ? Satellite : Radio;

  return (
    <div className="home">
      <div className="home-header">
        <span className="home-title">Navis</span>
        <div className={`status-pill ${status}`}>
          <StatusIcon size={11} />
          {badgeText}
        </div>
      </div>

      <div className={`map-card ${mapExpanded ? "map-card-expanded" : ""}`}>
        <button className="map-expand-btn" onClick={() => setMapExpanded((v) => !v)}>
          {mapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <MapContainer
          ref={mapRef}
          center={MAP_CENTER}
          zoom={17}
          scrollWheelZoom={mapExpanded}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          <MapFollower lat={pos.lat} lng={pos.lng} active={running} />
          <Polyline positions={ROUTE} pathOptions={{ color: "#B9AEDD", weight: 5, opacity: 0.55 }} />
          <Polyline positions={zonePts} pathOptions={{ color: zoneColor, weight: 5, dashArray: "2 8", opacity: 0.85 }}>
            {activeScenario && (
              <Tooltip sticky className="zone-tooltip">
                {activeScenario.label}
              </Tooltip>
            )}
          </Polyline>
          <Polyline positions={traveledPts} pathOptions={{ color: accent, weight: 4 }} />
          {status !== "gnss" && (
            <Circle
              center={[pos.lat, pos.lng]}
              radius={drift}
              pathOptions={{ color: accent, weight: 1, dashArray: "3 4", fillOpacity: 0.06 }}
            />
          )}
          <Marker position={[pos.lat, pos.lng]} icon={vehicleIcon(angle, accent)}>
            <Tooltip permanent direction="top" offset={[0, -6]} className="vehicle-tooltip">
              {Math.round(speed)} km/h
            </Tooltip>
          </Marker>
        </MapContainer>
      </div>

      <div className="metrics-row">
        {[
          { label: "Speed", value: Math.round(speed), unit: "km/h", Icon: Gauge },
          { label: "Drift", value: drift.toFixed(1), unit: "m", Icon: TrendingUp },
          { label: "ETA", value: 6, unit: "min", Icon: Clock },
        ].map((m) => (
          <div key={m.label} className="metric-card">
            <div className="metric-label">
              <m.Icon size={11} />
              <span>{m.label}</span>
            </div>
            <p className="metric-value">
              {m.value}
              <span className="metric-unit">{m.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="turn-card">
        <div className="turn-icon">
          <ChevronUp size={16} color="#6C4FD6" />
        </div>
        <div className="turn-text">
          <p className="turn-title">Continue straight</p>
          <p className="turn-subtitle">
            {status !== "gnss" && activeScenario ? activeScenario.note : "along Kartavya Path"}
          </p>
        </div>
        <span className="turn-distance">650 m</span>
      </div>

      <p className="scenario-heading">Simulate a GNSS-denied environment</p>
      <div className="scenario-row">
        {SCENARIOS.map((s) => {
          const isActive = running && activeScenario?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => runScenario(s)}
              disabled={running}
              className={`scenario-chip ${s.severity} ${isActive ? "chip-active" : ""}`}
            >
              <s.Icon size={13} />
              {isActive ? "Simulating…" : s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}