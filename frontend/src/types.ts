export interface User {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
  username?: string;
}

export interface MedicalRecord {
  id: number;
  diagnosis: string;
  description?: string;
  prescription?: string;
  notes?: string;
  doctor?: string;
  sensitive?: boolean;
  date?: string;
  createdAt?: string;
}

export interface Prescription {
  id: number;
  medication: string;
  dosage?: string;
  frequency?: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  notes?: string;
  createdAt?: string;
}

export interface Appointment {
  id: number;
  doctorName: string;
  specialty?: string;
  type: string;
  date?: string;
  time?: string;
  location?: string;
  status: string;
  notes?: string;
  createdAt?: string;
}

export interface Report {
  id: number;
  title: string;
  type: string;
  labName?: string;
  status: string;
  fileUrl?: string;
  summary?: string;
  date?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}