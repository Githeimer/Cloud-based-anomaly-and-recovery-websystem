import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/records", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(res)
      setRecords(res.data.records);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: "800px", margin: "50px auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Welcome, {user.name}!</h2>
        <button onClick={handleLogout} style={{ padding: "10px", background: "red", color: "white" }}>Logout</button>
      </div>
      <h3>Medical Records</h3>
      {records.length === 0 ? (
        <p>No records found.</p>
      ) : (
        records.map((record: any) => (
          <div key={record.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
            <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
            <p><strong>Description:</strong> {record.description}</p>
            <p><strong>Prescription:</strong> {record.prescription}</p>
            <p><strong>Date:</strong> {record.date}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;