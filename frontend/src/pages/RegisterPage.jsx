import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { axiosInstance, SIGNUP_URL } from '../api/config'
import './Auth.css'

export default function RegisterPage({ onAuthSuccess, setHideSearch }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [hobby, setHobby] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => { setHideSearch(true) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return alert("Hesla se neshodují!")
    }
    try {
      const response = await axiosInstance.post(SIGNUP_URL, { username, email, password })
      alert(response.data.message || "Registrace úspěšná!")
      await onAuthSuccess()
      navigate('/')
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Chyba při registraci. Zkuste to znovu."
      alert("Chyba: " + errorMsg)
    }
  }

  return (
    <div className="auth-container">
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Uživatelské jméno" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Emailová adresa" />
        </div>
        <div className="form-group">
          <label>Hobby (Optional)</label>
          <input type="text" value={hobby} onChange={e => setHobby(e.target.value)} placeholder="Vaše zájmy" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Heslo (aspoň 8 znaků)" />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Potvrzení hesla" />
        </div>
        <button type="submit" className="btn-submit">Register</button>
      </form>
      <div className="auth-links">
        Already have an account? <Link to="/login">Log in</Link>
        <br /><br />
        <Link to="/" className="text-muted">Back to Home</Link>
      </div>
    </div>
  )
}