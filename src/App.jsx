import { useState } from "react";
import Splash from "./Components/Splash.jsx";
import Login from "./Components/Login.jsx";
import Calibration from "./Components/Calibration.jsx";
import Home from "./Components/Home.jsx";
import "./App.css";

export default function App() {
  const [screen, setScreen] = useState("splash");

  return (
    <div className="app-page">
      <div className="phone-frame">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="phone-content">
            {screen === "splash" && <Splash onContinue={() => setScreen("login")} />}
            {screen === "login" && <Login onLogin={() => setScreen("calibration")} />}
            {screen === "calibration" && <Calibration onDone={() => setScreen("home")} />}
            {screen === "home" && <Home />}
          </div>
        </div>
      </div>
    </div>
  );
}