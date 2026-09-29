import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://skillalign-backend-6gux.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;