import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { axiosInstance, LOGIN_URL } from '../api/config'
import './Auth.css'

export default function LoginPage({ onAuthSuccess, setHideSearch }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => { setHideSearch(true) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axiosInstance.post(LOGIN_URL, { username, password })
      await onAuthSuccess()
      navigate('/')
    } catch (error) {
      alert("Chyba při přihlášení: Nesprávné jméno nebo heslo")
    }
  }

  return (
    <div className="auth-container">
      <h2>Log In</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username or Email</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Uživatelské jméno" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Heslo" />
        </div>
        <button type="submit" className="btn-submit">Log In</button>
      </form>
      <div className="auth-links">
        <Link to="/register">Create an account</Link>
        <br /><br />
        <Link to="/" className="text-muted">Back to Home</Link>
      </div>
    </div>
  )
}