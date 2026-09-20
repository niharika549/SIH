
import { useState } from "react";
import apiClient from "../api/client";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("Checking login...");

    try {
          const response = await apiClient.post("/api/auth/login", {
        email,
        password,
      });

      console.log(response.data);
      setMessage("Login request successful!");
    } catch (error) {
      console.error(error);
      setMessage("Login failed. Please check your details.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>SkillAlign</h1>
        <p>Login to your account</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        <p>{message}</p>
      </div>
    </div>
  );
}

export default Login;