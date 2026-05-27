import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/auth/register", { name, email, password });
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", padding: "20px" }}>
      <h2>Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleRegister}>
        <div>
          <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        </div>
        <div>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        </div>
        <div>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        </div>
        <button type="submit" style={{ width: "100%", padding: "10px", background: "green", color: "white" }}>Register</button>
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
  );
};

export default Register;