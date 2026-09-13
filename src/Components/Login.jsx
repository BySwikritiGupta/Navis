import { useState } from "react";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    onLogin();
  };

  return (
    <div className="login">
      <h1>Log in</h1>
      <p className="login-subtitle">Pick up navigation where you left off.</p>

      <form onSubmit={submit} className="login-form">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-submit">
          Log in
        </button>
      </form>

      <button onClick={onLogin} className="login-skip">
        skip for now
      </button>
    </div>
  );
}