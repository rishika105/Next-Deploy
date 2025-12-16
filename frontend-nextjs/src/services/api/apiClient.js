import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "http://localhost:9000/api",
  timeout: 20000,
});

//handle errors no need for try and catch
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      "Something went wrong. Please try again.";

    // 🔥 ONE PLACE FOR TOAST
    toast.error(message);

    return Promise.reject(error);
  }
);

export default api;
