// src/config/api.js
import axios from "axios";

// This points to your Node.js API running in WSL
const API_URL = "http://localhost:3001/api";

export const registerUser = async (userData) => {
  try {
    // We send the entire object to the backend
    const response = await axios.post(`${API_URL}/register`, userData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: "Network Error" };
  }
};

export const loginUser = async (username, password) => {
  // Added password param
  try {
    const response = await axios.post(`${API_URL}/login`, {
      username,
      password,
    });
    if (response.data.success) {
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: "Network Error" };
  }
};

export const fetchUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : { error: "Network Error" };
  }
};

//RESET PASSWORD OTP
export const requestOTP = async (identifier) => {
    const response = await axios.post(`${API_URL}/auth/forgot-password`, { identifier });
    return response.data;
};

export const resetPassword = async (identifier, otp, newPassword) => {
    const response = await axios.post(`${API_URL}/auth/reset-password`, { identifier, otp, newPassword });
    return response.data;
};

export const verifyOTP = async (identifier, otp) => {
    const response = await axios.post(`${API_URL}/auth/verify-otp`, { identifier, otp });
    return response.data;
};