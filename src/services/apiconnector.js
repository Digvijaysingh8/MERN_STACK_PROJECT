import axios from "axios"

export const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL, // Ensures `baseURL` is automatically applied
  timeout: 10000, // Timeout after 10 seconds
  headers: { "Content-Type": "application/json" }, // Default headers
});


export const apiConnector = async (method, url, bodyData, headers, params) => {
  try {
    return await axiosInstance({
      method: method,
      url: url,
      data: bodyData || null,
      headers: headers || null,
      params: params || null,
    });
  } catch (error) {
    console.error("API ERROR:", error?.response?.data || error.message);
    throw error?.response?.data || new Error("Something went wrong!");
  }
};
