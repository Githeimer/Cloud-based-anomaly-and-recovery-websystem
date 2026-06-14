import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [records, setRecords] = useState([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [description, setDescription] = useState("");
  const [prescription, setPrescription] = useState("");
  const [date, setDate] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/records", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data.records);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/records",
        { diagnosis, description, prescription, date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiagnosis(""); setDescription(""); setPrescription(""); setDate("");
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`http://localhost:8000/api/records/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecords();
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

      <h3>Add New Record</h3>
      <form onSubmit={handleCreate}>
        <input placeholder="Diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        <input placeholder="Prescription" value={prescription} onChange={e => setPrescription(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
        <button type="submit" style={{ padding: "10px 20px", background: "green", color: "white" }}>Add Record</button>
      </form>

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
            <button onClick={() => handleDelete(record.id)} style={{ padding: "5px 10px", background: "red", color: "white" }}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;