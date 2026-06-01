import axios from 'axios'

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
})

export const API_URL = 'http://localhost:8000/api/news/'
export const LOGIN_URL = 'http://localhost:8000/api/login/'
export const SIGNUP_URL = 'http://localhost:8000/api/signup/'
export const PROFILE_URL = 'http://localhost:8000/api/profile/'
export const TOGGLE_SAVE_URL = 'http://localhost:8000/api/toggle-save/'
export const POINTS_URL = 'http://localhost:8000/api/add-points/'
export const FORUM_URL = 'http://localhost:8000/api/forum/'
export const LOGOUT_URL = 'http://localhost:8000/api/logout/'