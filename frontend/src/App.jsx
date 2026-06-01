import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { axiosInstance, API_URL, LOGOUT_URL, PROFILE_URL } from './api/config'
import HomePage from './pages/HomePage'
import ArticleDetail from './pages/ArticleDetail'
import UserProfilePage from './pages/UserProfilePage'
import ForumList from './pages/ForumList'
import ForumThreadDetail from './pages/ForumThreadDetail'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import './App.css'

function MainApp() {
  const [news, setNews] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [userAvatar, setUserAvatar] = useState(null)
  const [savedArticleIds, setSavedArticleIds] = useState([])
  const [readArticleIds, setReadArticleIds] = useState([]) 
  const [preferredCategories, setPreferredCategories] = useState([])
  const [activeTab, setActiveTab] = useState('all') 
  const [activeCategory, setActiveCategory] = useState('') 
  const categories = ['Science', 'IT', 'Sport'] 
  const [hideSearch, setHideSearch] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleLogout = async () => {
    try {
      await axiosInstance.post(LOGOUT_URL)
      setIsAuthenticated(false)
      setUsername('')
      setUserAvatar(null)
      window.location.href = '/' 
    } catch (error) { console.error(error) }
  }

  const checkAuthStatus = async () => {
    try {
      const response = await axiosInstance.get(PROFILE_URL)
      setIsAuthenticated(true)
      setUsername(response.data.user.username)
      setUserAvatar(response.data.avatar_url)
      if (response.data.read_later) setSavedArticleIds(response.data.read_later.map(a => a.id))
      if (response.data.read_history) setReadArticleIds(response.data.read_history)
      if (response.data.preferred_categories) setPreferredCategories(response.data.preferred_categories.map(c => c.name))
    } catch (error) { setIsAuthenticated(false) }
  }

  const fetchNews = async (q = search, cat = activeCategory) => {
    try {
      let url = `${API_URL}?`
      if (q) url += `q=${encodeURIComponent(q)}&`
      if (cat) url += `category=${encodeURIComponent(cat)}&`
      const response = await axiosInstance.get(url)
      setNews(response.data)
    } catch (error) { console.error(error) }
  }

  useEffect(() => { fetchNews(search, activeCategory) }, [activeCategory])
  useEffect(() => { checkAuthStatus() }, [])

  const handleToggleSaveInParent = (article, isSaved) => {
    if (isSaved) setSavedArticleIds(prev => [...prev, article.id])
    else setSavedArticleIds(prev => prev.filter(id => id !== article.id))
  }

  return (
    <BrowserRouter>
      <div className="navbar">
        <Link to="/" onClick={() => { setActiveCategory(''); setActiveTab('all'); setHideSearch(false); }} className="navbar-brand">
          NewsAggregator
        </Link>
        {!hideSearch && (
          <div className="search-wrapper">
            <form className="search-bar-final" onSubmit={(e) => { 
              e.preventDefault()
              if (!window.location.pathname.includes('/forum')) fetchNews(search, activeCategory)
            }}>
              <input 
                type="text" 
                placeholder={window.location.pathname.includes('/forum') ? "Search forum..." : "Search news..."} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
              <button type="submit">🔍</button>
            </form>
          </div>
        )}
        <div className="navbar-actions">
          <Link to="/forum" className="nav-link" style={{marginRight: '15px'}}>Forum</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="nav-profile-btn">
                <div className="avatar-gradient avatar-xs" style={{marginRight: '8px'}}>
                  {userAvatar ? <img src={userAvatar} alt="NavNav" className="avatar-img" /> : (username ? username.charAt(0).toUpperCase() : 'U')}
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{username}</span>
              </Link>
              <button onClick={handleLogout} className="btn-danger">Logout</button>            
            </>
          ) : (
            <div className="flex-align-center" style={{gap: '15px'}}>
              <Link to="/login" className="nav-link">Log In</Link>
              <Link to="/register" className="btn-signup">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
      <div className="content-container">
        <Routes>
          <Route path="/" element={
            <HomePage 
              news={news}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories}
              isAuthenticated={isAuthenticated}
              savedArticleIds={savedArticleIds}
              setHideSearch={setHideSearch}
              handleToggleSaveInParent={handleToggleSaveInParent}
              search={debouncedSearch}
              preferredCategories={preferredCategories}
            />
          } />
          <Route path="/article/:id" element={<ArticleDetail isAuthenticated={isAuthenticated} onPointsAdded={checkAuthStatus} setHideSearch={setHideSearch} readArticleIds={readArticleIds} currentUsername={username} currentUserAvatar={userAvatar} />} />          
          <Route path="/profile" element={<UserProfilePage setHideSearch={setHideSearch} triggerAuthRefresh={checkAuthStatus} news={news} />} />
          <Route path="/forum" element={<ForumList isAuthenticated={isAuthenticated} setHideSearch={setHideSearch} search={debouncedSearch} currentUsername={username} />} />
          <Route path="/forum/:id" element={<ForumThreadDetail isAuthenticated={isAuthenticated} setHideSearch={setHideSearch} currentUsername={username} currentUserAvatar={userAvatar} />} />                    
          <Route path="/login" element={<LoginPage onAuthSuccess={checkAuthStatus} setHideSearch={setHideSearch} />} />
          <Route path="/register" element={<RegisterPage onAuthSuccess={checkAuthStatus} setHideSearch={setHideSearch} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
export default MainApp