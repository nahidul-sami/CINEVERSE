import API from "./api";

export const registerUser = (data) => API.post("/register", data);
export const loginUser = (data) => API.post("/login", data);
export const getProfile = () => API.get("/profile");
export const updateProfile = (data) => API.put("/profile", data);