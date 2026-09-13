import { useState, useEffect, useRef } from "react";
import { Smartphone, ArrowRight } from "lucide-react";
import "./Calibration.css";

const DURATION = 2200;

export default function Calibration({ onDone }) {
  const [mount, setMount] = useState("dashboard");
  const [calibrating, setCalibrating] = useState(false);
  const [done, setDone] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [yaw, setYaw] = useState(0);
  const targetRef = useRef({ pitch: 0, roll: 0, yaw: 0 });
  const startRef = useRef(0);
  const rafRef = useRef(null);

  const start = () => {
    if (calibrating) return;
    setDone(false);
    setCalibrating(true);
    targetRef.current = {
      pitch: 6 + Math.random() * 8,
      roll: (Math.random() - 0.5) * 8,
      yaw: (Math.random() - 0.5) * 10,
    };
    startRef.current = performance.now();
  };

  useEffect(() => {
    if (!calibrating) return;
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / DURATION);
      const settle = t * t; // ease toward target as time passes
      const noise = (1 - settle) * 14;
      const { pitch: tp, roll: tr, yaw: ty } = targetRef.current;

      setPitch(tp + (Math.random() - 0.5) * noise);
      setRoll(tr + (Math.random() - 0.5) * noise);
      setYaw(ty + (Math.random() - 0.5) * noise);

      if (t >= 1) {
        setPitch(tp);
        setRoll(tr);
        setYaw(ty);
        setCalibrating(false);
        setDone(true);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [calibrating]);

  return (
    <div className="calib">
      <div className="calib-header">
        <h1>Calibration</h1>
        <p>Align to the vehicle's driving direction before navigating.</p>
      </div>

      <div className="mount-toggle">
        <button
          className={mount === "dashboard" ? "mount-btn active" : "mount-btn"}
          onClick={() => setMount("dashboard")}
        >
          Dashboard mounted
        </button>
        <button
          className={mount === "holder" ? "mount-btn active" : "mount-btn"}
          onClick={() => setMount("holder")}
        >
          In a holder
        </button>
      </div>

      <div className="calib-stage">
        <div
          className="calib-phone"
          style={{
            transform: `rotateX(${-pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`,
          }}
        >
          <Smartphone size={40} color="#fff" />
        </div>
        <div className="calib-plane" />
      </div>

      <div className="axis-row">
        {[
          { label: "Pitch", value: pitch },
          { label: "Roll", value: roll },
          { label: "Yaw", value: yaw },
        ].map((a) => (
          <div key={a.label} className="axis-card">
            <span className="axis-label">{a.label}</span>
            <p className="axis-value">
              {a.value.toFixed(1)}
              <span className="axis-unit">°</span>
            </p>
            <div className="axis-bar">
              <div
                className="axis-bar-fill"
                style={{
                  left: `${50 + Math.max(-50, Math.min(50, a.value * 2.5))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {done && (
        <p className="calib-status">
          Aligned — offsets locked for {mount === "dashboard" ? "dashboard mount" : "holder mount"}
        </p>
      )}

      {!done ? (
        <button className="calib-primary" onClick={start} disabled={calibrating}>
          {calibrating ? "Calibrating…" : "Start calibration"}
        </button>
      ) : (
        <button className="calib-primary" onClick={onDone}>
          Continue to navigation
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}