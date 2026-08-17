import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api/movies",
});

API.interceptors.request.use((req) => {
    const token = localStorage.getItem("token");
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

export const getAllMovies = () => API.get("/");
export const getMovieById = (id) => API.get(`/${id}`);
export const createMovie = (data) => API.post("/", data);
