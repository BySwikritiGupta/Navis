import "./Splash.css";

export default function Splash({ onContinue }) {
  return (
    <div className="splash" onClick={onContinue}>
      <div className="splash-logo">
        <span>N</span>
      </div>
      <p className="splash-name">Navis</p>
      <p className="splash-tagline">Navigation that doesn't stop at the tunnel</p>
      <p className="splash-hint">tap to continue</p>
    </div>
  );
}