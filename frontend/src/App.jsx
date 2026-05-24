import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios' // заменится на 'axios' автоматически
import axiosInstance from 'axios' // Оставляем чистый axios

axiosInstance.defaults.withCredentials = true;

const API_URL = 'http://localhost:8000/api/news/'
const LOGIN_URL = 'http://localhost:8000/api/login/' 
const SIGNUP_URL = 'http://localhost:8000/api/signup/' 
const PROFILE_URL = 'http://localhost:8000/api/profile/'
const TOGGLE_SAVE_URL = 'http://localhost:8000/api/toggle-save/'
const POINTS_URL = 'http://localhost:8000/api/add-points/'

const cleanHtml = (htmlString) => {
  if (!htmlString) return '';
  return htmlString.replace(/<img[^>]*>/g, '');
};

// ==========================================
// 1. КАРТОЧКА СТАТЬИ НА ГЛАВНОЙ
// ==========================================
function ShortNewsCard({ item, isSaved, onToggleSave, isAuthenticated }) {
  const [saved, setSaved] = useState(isSaved)

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return alert("Pro uložení se musíte přihlásit!")
    try {
      const response = await axiosInstance.post(TOGGLE_SAVE_URL, { news_id: item.id })
      setSaved(response.data.is_saved)
      if (onToggleSave) onToggleSave(item, response.data.is_saved)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Link to={`/article/${item.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '15px', backgroundColor: '#1e1e1e' }}>
        {item.image_url && (
          <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '5px', marginBottom: '10px' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#64af67' }}>{item.title}</h3>
          <button onClick={handleSave} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: saved ? '#ffc107' : '#555' }}>
            {saved ? '★' : '☆'}
          </button>
        </div>
        <p style={{ color: '#ccc', fontSize: '14px', maxHeight: '60px', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: cleanHtml(item.description) }} />
        <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          Zdroj: {item.source} | Kategorie: {item.category_name || 'Sport'}
        </div>
      </div>
    </Link>
  )
}

// ==========================================
// 2. ДЕТАЛЬНАЯ СТРАНИЦА СТАТЬИ
// ==========================================
function ArticleDetail({ isAuthenticated, onPointsAdded }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [timeLeft, setTimeLeft] = useState(10)
  const [isRead, setIsRead] = useState(false)
  const timerRef = useRef(null)
  const [commentText, setCommentText] = useState('')

  const fetchDetail = async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}${id}/`)
      setArticle(response.data)
      const wordCount = response.data.description ? response.data.description.replace(/<[^>]*>/g, '').split(/\s+/).length : 10
      setTimeLeft(Math.max(5, Math.round(wordCount / 2)))
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  useEffect(() => {
    if (article && timeLeft > 0 && !isRead) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [article])

  const handleMarkAsRead = async () => {
    if (!isAuthenticated) return alert("Musíte se přihlásit!")
    try {
      const response = await axiosInstance.post(POINTS_URL, { news_id: article.id })
      setIsRead(true)
      if (onPointsAdded) onPointsAdded(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    try {
      await axiosInstance.post(`${API_URL}${id}/comment/`, { text: commentText })
      setCommentText('')
      fetchDetail()
    } catch (error) {
      alert("Chyba při odesílání komentáře")
    }
  }

  if (!article) return <p style={{color:'white', padding: '20px'}}>Načítání...</p>

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', padding: '20px', borderRadius: '8px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '20px', padding: '8px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        ← Zpět
      </button>

      {article.image_url && <img src={article.image_url} style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', marginBottom: '20px' }} />}
      <h1 style={{ color: '#64af67' }}>{article.title}</h1>
      <p style={{ color: '#888', fontSize: '14px' }}>Zdroj: {article.source} | <a href={article.link} target="_blank" style={{color: '#007bff'}}>Odkaz na originál</a></p>
      <div style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '20px', color: '#ccc' }} dangerouslySetInnerHTML={{ __html: cleanHtml(article.description) }} />

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#1e1e1e', borderRadius: '8px', textAlign: 'center' }}>
        <button
          disabled={timeLeft > 0 || isRead}
          onClick={handleMarkAsRead}
          style={{
            padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', borderRadius: '5px', border: 'none',
            cursor: timeLeft > 0 || isRead ? 'not-allowed' : 'pointer',
            backgroundColor: isRead ? '#28a745' : timeLeft > 0 ? '#6c757d' : '#4ba35b', color: 'white'
          }}
        >
          {isRead ? '✓ Přečteno (+10 XP)' : timeLeft > 0 ? `Čtěte ještě ${timeLeft}s pro XP` : 'Označit jako přečtené (+10 XP)'}
        </button>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>Komentáře ({article.comments?.length || 0})</h3>
        {isAuthenticated ? (
          <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} required placeholder="Napište komentář..." style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#222', color: 'white' }} />
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>Odeslat</button>
          </form>
        ) : <p style={{ color: '#888' }}>Pro přidání komentáře se musíte přihlásit.</p>}

        {article.comments?.map(c => (
          <div key={c.id} style={{ padding: '15px', marginBottom: '10px', borderRadius: '5px', backgroundColor: '#222', border: c.author_level > 3 ? '2px solid #ffc107' : '1px solid #333' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: c.author_level > 3 ? '#ffc107' : '#fff' }}>
              {c.author} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#888' }}>(Úroveň: {c.author_level})</span>
            </div>
            <div style={{ color: '#ccc' }}>{c.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// 3. СТРАНИЦА ЛИЧНОГО КАБИНЕТА ПРОФИЛЯ
// ==========================================
function UserProfilePage() {
  const [profileData, setProfileData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get(PROFILE_URL)
        setProfileData(response.data)
      } catch (err) {
        setError('Nepodařilo se načíst data profilu. Jste přihlášeni?')
      }
    }
    fetchProfile()
  }, [])

  if (error) return <div style={{ padding: '20px', color: '#dc3545' }}>{error}</div>
  if (!profileData) return <div style={{ padding: '20px', color: '#fff' }}>Načítání profilu...</div>

  // Рассчитываем процент прогресс-бара до следующего уровня (максимум 50 XP на уровень)
  const progressPercent = Math.min(100, (profileData.current_level_progress / 50) * 100)

  return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '12px', border: '1px solid #333', marginTop: '20px' }}>
      <h2 style={{ color: '#64af67', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '15px' }}>Můj Uživatelský Profil</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Левая колонка: Системные данные */}
        <div style={{ backgroundColor: '#121212', padding: '20px', borderRadius: '8px', border: '1px solid #222' }}>
          <h4 style={{ color: '#aaa', margin: '0 0 15px 0' }}>Osobní údaje</h4>
          <p><strong>Uživatelské jméno:</strong> {profileData.user.username}</p>
          <p><strong>E-mail:</strong> {profileData.user.email}</p>
          <p><strong>Datum registrace:</strong> {profileData.user.date_joined}</p>
          <p><strong>Uložené články:</strong> {profileData.saved_count} ks</p>
        </div>

        {/* Правая колонка: Игровая статистика */}
        <div style={{ backgroundColor: '#121212', padding: '20px', borderRadius: '8px', border: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ color: '#ffc107', margin: '0 0 15px 0' }}>Herní statistiky (Gamifikace)</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            Úroveň: <span style={{ color: '#ffc107' }}>{profileData.level}</span>
          </div>
          <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '5px' }}>
            Celkové XP: <strong>{profileData.points} XP</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
            Pokrok do další úrovně: {profileData.current_level_progress} / 50 XP
          </div>
          
          {/* Визуальный Прогресс-бар */}
          <div style={{ width: '100%', backgroundColor: '#333', height: '15px', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, backgroundColor: '#ffc107', height: '100%', transition: 'width 0.5s ease-in-out' }}></div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ==========================================
// 4. ОСНОВНОЙ КОМПОНЕНТ APP
// ==========================================
function MainApp() {
  const [news, setNews] = useState([])
  const [search, setSearch] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [userStats, setUserStats] = useState({ level: 1, points: 0 })
  const [savedArticleIds, setSavedArticleIds] = useState([])
  const [activeTab, setActiveTab] = useState('all')

  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const checkAuthStatus = async () => {
    try {
      const response = await axiosInstance.get(PROFILE_URL)
      setIsAuthenticated(true)
      setUsername(response.data.user.username)
      setUserStats({ level: response.data.level, points: response.data.points })
      if (response.data.read_later) setSavedArticleIds(response.data.read_later.map(a => a.id))
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const fetchNews = async (q = '') => {
    try {
      const response = await axiosInstance.get(q ? `${API_URL}?q=${q}` : API_URL)
      setNews(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchNews()
    checkAuthStatus()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    try {
      await axiosInstance.post(isRegisterMode ? SIGNUP_URL : LOGIN_URL, { username: loginUsername, password: loginPassword })
      await checkAuthStatus()
      setLoginUsername(''); setLoginPassword('');
    } catch (error) {
      alert("Chyba při přihlášení/registraci")
    }
  }

  const handleToggleSaveInParent = (article, isSaved) => {
    if (isSaved) setSavedArticleIds(prev => [...prev, article.id])
    else setSavedArticleIds(prev => prev.filter(id => id !== article.id))
  }

  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
        
        {/* НАВИГАЦИОННАЯ ШАПКА */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'white' }}><h1 style={{ margin: 0 }}>Tech News</h1></Link>
            {isAuthenticated && (
              <Link to="/profile" style={{ color: '#64af67', textDecoration: 'none', fontWeight: 'bold', fontSize: '16px', marginLeft: '10px', border: '1px solid #444', padding: '5px 10px', borderRadius: '5px', backgroundColor: '#222' }}>
                👤 Můj profil
              </Link>
            )}
          </div>
          
          {isAuthenticated ? (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#222', padding: '10px 15px', borderRadius: '8px', border: '1px solid #444', textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: '#64af67' }}>{username}</div>
                <div style={{ fontWeight: 'bold', color: '#ffc107' }}>Úroveň: {userStats.level}</div>
              </div>
              <button onClick={() => { document.cookie = 'sessionid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'; window.location.reload() }} style={{ padding: '8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Odhlásit</button>
            </div>
          ) : (
            <form onSubmit={handleAuth} style={{ display: 'flex', gap: '5px' }}>
              <input type="text" placeholder="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} style={{ padding: '5px', width: '100px' }}/>
              <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} style={{ padding: '5px', width: '100px' }}/>
              <button type="submit" style={{ padding: '5px 10px', backgroundColor: '#4ba35b', color: 'white', border: 'none' }}>{isRegisterMode ? 'Up' : 'In'}</button>
              <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}>Změnit</button>
            </form>
          )}
        </div>

        {/* МАРШРУТЫ СТРАНИЦ */}
        <Routes>
          {/* Главная страница со списком новостей */}
          <Route path="/" element={
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('all')} style={{ padding: '10px', backgroundColor: activeTab === 'all' ? '#4ba35b' : '#222', color: 'white', border: 'none', borderRadius: '5px' }}>Všechny články</button>
                {isAuthenticated && <button onClick={() => setActiveTab('saved')} style={{ padding: '10px', backgroundColor: activeTab === 'saved' ? '#ffc107' : '#222', color: activeTab === 'saved' ? '#000' : 'white', border: 'none', borderRadius: '5px' }}>Přečíst později</button>}
              </div>

              {activeTab === 'all' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input type="text" placeholder="Hledat..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #333' }} />
                  <button onClick={() => fetchNews(search)} style={{ padding: '10px 20px', backgroundColor: '#4ba35b', color: 'white', border: 'none' }}>Hledat</button>
                </div>
              )}

              {news.filter(n => activeTab === 'all' || savedArticleIds.includes(n.id)).map(item => (
                <ShortNewsCard key={item.id} item={item} isSaved={savedArticleIds.includes(item.id)} onToggleSave={handleToggleSaveInParent} isAuthenticated={isAuthenticated} />
              ))}
            </>
          } />
          
          {/* Детальная страница статьи */}
          <Route path="/article/:id" element={
            <ArticleDetail isAuthenticated={isAuthenticated} onPointsAdded={data => setUserStats({ level: data.level, points: data.points })} />
          } />

          {/* СТРАНИЦА ЛИЧНОГО КАБИНЕТА */}
          <Route path="/profile" element={<UserProfilePage />} />
        </Routes>

      </div>
    </BrowserRouter>
  )
}

export default MainApp