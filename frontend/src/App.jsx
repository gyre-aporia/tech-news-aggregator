import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './App.css'; 

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000', // твой URL бэкенда
  withCredentials: true,            // КРИТИЧЕСКИ ВАЖНО ДЛЯ КУК И СЕССИЙ!
});


const API_URL = 'http://localhost:8000/api/news/'
const LOGIN_URL = 'http://localhost:8000/api/login/' 
const SIGNUP_URL = 'http://localhost:8000/api/signup/' 
const PROFILE_URL = 'http://localhost:8000/api/profile/'
const TOGGLE_SAVE_URL = 'http://localhost:8000/api/toggle-save/'
const POINTS_URL = 'http://localhost:8000/api/add-points/'
const FORUM_URL = 'http://localhost:8000/api/forum/'
const LOGOUT_URL = 'http://localhost:8000/api/logout/'

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
    <div className="card">
      <div style={{ height: '200px', overflow: 'hidden', background: '#f0f0f0', position: 'relative' }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <img src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600" alt="Fallback" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      
      <div className="card-body">
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="source-tag">{item.source}</span>
            {item.category_name && (
              <span style={{ background: '#007bff', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', marginLeft: '5px' }}>
                {item.category_name}
              </span>
            )}
          </div>
          <button onClick={handleSave} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: saved ? '#ffc107' : '#ccc', padding: 0 }}>
            {saved ? '★' : '☆'}
          </button>
        </div>
        
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#222' }}>{item.title}</h3>
        <p style={{ color: '#555', fontSize: '14px', flexGrow: 1, marginBottom: '20px', maxHeight: '60px', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: cleanHtml(item.description) }} />
        
        <div className="card-buttons">
          <a href={item.link} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: 'white', color: '#28a745', border: '1px solid #28a745', padding: '10px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Source ↗
          </a>
          <Link to={`/article/${item.id}`} style={{ flex: 1, textAlign: 'center', background: '#007bff', color: 'white', padding: '10px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Discuss
          </Link>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 2. ДЕТАЛЬНАЯ СТРАНИЦА СТАТЬИ
// ==========================================
function ArticleDetail({ isAuthenticated, onPointsAdded, setHideSearch, readArticleIds, currentUsername, currentUserAvatar }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  
  const [timeLeft, setTimeLeft] = useState(60) 
  const [isRead, setIsRead] = useState(false)
  const timerRef = useRef(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => { setHideSearch(true) }, [])

  const fetchDetail = async (isRefresh = false) => {
    try {
      const response = await axiosInstance.get(`${API_URL}${id}/`)
      setArticle(response.data)
      
      if (isRefresh) return;
      
      const alreadyRead = readArticleIds && readArticleIds.includes(Number(id))
      
      if (alreadyRead) {
        setIsRead(true)
        setTimeLeft(0) 
      } else {
        const wordCount = response.data.description ? response.data.description.replace(/<[^>]*>/g, '').split(/\s+/).length : 50
        setTimeLeft(Math.max(60, Math.round(wordCount / 2)))
      }
    } catch (error) { console.error(error) }
  }

  useEffect(() => { fetchDetail(false) }, [id, readArticleIds])

  useEffect(() => {
    if (article && timeLeft > 0 && !isRead) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [article, isRead])

  const handleMarkAsRead = async () => {
    if (!isAuthenticated) return alert("Musíte se přihlásit!")
    try {
      const response = await axiosInstance.post(POINTS_URL, { news_id: article.id })
      setIsRead(true)
      if (onPointsAdded) onPointsAdded(response.data) 
    } catch (error) { console.error(error) }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    try {
      await axiosInstance.post(`${API_URL}${id}/comment/`, { text: commentText })
      setCommentText('')
      fetchDetail(true) 
    } catch (error) { alert("Chyba při odesílání komentáře") }
  }

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Opravdu chcete smazat tento komentář?")) {
      try {
        await axiosInstance.delete(`http://localhost:8000/api/comment/${commentId}/delete/`);
        fetchDetail(true); 
      } catch (error) { alert("Chyba při mazání"); }
    }
  }
  
  if (!article) return <div className="content-container">Načítání...</div>

  return (
    <div className="content-container" style={{ maxWidth: '800px', background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', margin: '30px auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#555', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', fontSize: '16px', padding: 0 }}>
        ← Zpět
      </button>

      <div>
        <span className="source-tag" style={{ background: '#007bff' }}>{article.category_name || 'Zprávy'}</span>
        <span style={{ color: '#888', fontSize: '14px', marginLeft: '10px' }}>Zdroj: {article.source}</span>
      </div>

      <h1 style={{ fontSize: '32px', margin: '15px 0', color: '#222' }}>{article.title}</h1>
      {article.image_url && <img src={article.image_url} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '25px' }} />}
      <div className="article-content" dangerouslySetInnerHTML={{ __html: cleanHtml(article.description) }} />
      
      <a href={article.link} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#28a745', color: 'white', padding: '12px 25px', textDecoration: 'none', borderRadius: '30px', fontWeight: 'bold', marginTop: '20px' }}>
        Číst originál ↗
      </a>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '10px', textAlign: 'center', border: '1px solid #e9ecef' }}>
        <button disabled={timeLeft > 0 || isRead} onClick={handleMarkAsRead} className="btn-submit" style={{ width: 'auto', padding: '12px 30px', background: isRead ? '#28a745' : timeLeft > 0 ? '#6c757d' : '#007bff' }}>
          {isRead ? '✓ Přečteno (+10 XP)' : timeLeft > 0 ? `Čtěte ještě ${timeLeft}s pro XP` : 'Označit jako přečtené (+10 XP)'}
        </button>
      </div>

      <hr style={{ margin: '50px 0', borderTop: '1px solid #eee' }} />

      <h3>Komentáře ({article.comments?.length || 0})</h3>
      {isAuthenticated ? (
        <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '15px', marginBottom: '30px', background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #e9ecef' }}>
          
          {/* ИСПРАВЛЕННАЯ АВАТАРКА ВОЗЛЕ ВВОДА КОММЕНТАРИЯ */}
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #007bff 0%, #aa3bff 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', overflow: 'hidden' }}>
            {currentUserAvatar ? (
              <img src={currentUserAvatar} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          
          <div style={{ flexGrow: 1 }}>
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} required placeholder="Napište komentář..." style={{ marginBottom: '10px' }} />
            <button type="submit" className="btn-submit" style={{ width: 'auto', margin: 0, padding: '8px 20px' }}>Odeslat</button>
          </div>
        </form>
      ) : <p style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px' }}>Pro přihlášení se musíte přihlásit.</p>}

      {article.comments?.map(c => (
        <div key={c.id} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            
            {/* ИСПРАВЛЕННАЯ АВАТАРКА ЧУЖОГО КОММЕНТАРИЯ */}
             <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #007bff 0%, #aa3bff 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', border: c.author_level > 3 ? '2px solid #ffc107' : 'none', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden' }}>
                {c.author_avatar ? (
                  <img src={c.author_avatar} alt={c.author} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  c.author ? c.author.charAt(0).toUpperCase() : 'U'
                )}
            </div>

            <div>
              <strong style={{ color: '#333' }}>{c.author}</strong> <span style={{ color: '#999', fontSize: '12px' }}>(Úroveň: {c.author_level})</span>
              {c.author === currentUsername && (
                <button onClick={() => handleDeleteComment(c.id)} style={{ color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', marginLeft: '10px' }}>[Smazat]</button>
              )}
            </div>
          </div>
          <div style={{ marginLeft: '42px', background: '#f1f1f1', padding: '10px 15px', borderRadius: '0 10px 10px 10px', display: 'inline-block' }}>{c.text}</div>
        </div>
      ))}
    </div>
  )
}
// ==========================================
// 3. СТРАНИЦА ЛИЧНОГО КАБИНЕТА ПРОФИЛЯ
// ==========================================
function UserProfilePage({ setHideSearch, triggerAuthRefresh }) {
  const [profileData, setProfileData] = useState(null)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    username: '', email: '', bio: '', birthDate: ''
  })
  // НОВЫЕ СТЕЙТЫ ДЛЯ АВАТАРКИ:
  const [avatarFile, setAvatarFile] = useState(null)
  const [clearAvatar, setClearAvatar] = useState(false)

  useEffect(() => { setHideSearch(true) }, [])

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get(PROFILE_URL)
      setProfileData(response.data)
      setFormData({
        username: response.data.user.username || '',
        email: response.data.user.email || '',
        bio: response.data.bio || '',
        birthDate: response.data.birth_date || ''
      })
    } catch (err) { setError('Nepodařilo se načíst data profilu.') }
  }

  useEffect(() => { fetchProfile() }, [])

  const handleSaveAllChanges = async (e) => {
    e.preventDefault()
    try {
      // ИСПРАВЛЕНИЕ: Создаем объект FormData для отправки файлов и текста
      const submitData = new FormData();
      submitData.append('username', formData.username);
      submitData.append('email', formData.email);
      submitData.append('bio', formData.bio);
      submitData.append('birthDate', formData.birthDate);
      
      // Добавляем файл, если пользователь его выбрал
      if (avatarFile) {
        submitData.append('avatar', avatarFile);
      }
      // Передаем команду на удаление старого фото, если стоит галочка
      if (clearAvatar) {
        submitData.append('clear_avatar', 'true');
      }

      // Отправляем на сервер с правильными заголовками
      await axiosInstance.post(PROFILE_URL, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      alert("Změny byly úspěšně uloženy!")
      setIsEditing(false)
      setAvatarFile(null) // очищаем выбранный файл после сохранения
      setClearAvatar(false)
      fetchProfile()
      triggerAuthRefresh() 
    } catch (err) { alert("Chyba při ukládání změn.") }
  }

  if (error) return <div className="content-container" style={{ color: '#dc3545' }}>{error}</div>
  if (!profileData) return <div className="content-container">Načítání profilu...</div>

  const progressPercent = Math.min(100, (profileData.current_level_progress / 50) * 100)

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
      <div style={{ width: '150px', height: '150px', borderRadius: '50%', margin: '0 auto 20px', border: '5px solid #e9ecef', boxShadow: '0 5px 15px rgba(0,123,255,0.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {profileData.avatar_url ? (
          <img src={profileData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #007bff 0%, #aa3bff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '70px', color: 'white' }}>
            {profileData.user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '32px' }}>{profileData.user.username}</h1>
      <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '30px 0' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', textAlign: 'left' }}>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', border: '1px solid #e9ecef' }}>
          {!isEditing ? (
            <>
              <h3 style={{ color: '#333', fontSize: '18px', marginTop: 0, marginBottom: '15px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>Osobní údaje</h3>
              <p style={{ color: '#555', lineHeight: '2', margin: 0, fontSize: '15px' }}>
                <strong>Uživatelské jméno:</strong> {profileData.user.username}<br/>
                <strong>E-mail:</strong> {profileData.user.email}<br/>
                <strong>Datum registrace:</strong> {profileData.user.date_joined}<br/>
                <strong>Bio / About Me:</strong> {profileData.bio || 'nic'}<br/>
                <strong>Birth Date:</strong> {profileData.birth_date || 'dd.mm.rrrr'}
              </p>
              <button onClick={() => setIsEditing(true)} className="btn-submit" style={{ marginTop: '25px' }}>Edit Profile</button>
            </>
          ) : (
            <form onSubmit={handleSaveAllChanges}>
              <h2 style={{ fontSize: '22px', marginBottom: '20px', marginTop: 0, color: '#333' }}>Edit Profile</h2>
              
              <fieldset style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <legend style={{ fontWeight: 'bold', color: '#007bff', padding: '0 10px' }}>Account Info</legend>
                
                {/* НОВОЕ: ПОЛЕ ДЛЯ ЗАГРУЗКИ ФОТО */}
                <div style={{ marginBottom: '15px', background: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Profilová fotka (Avatar)</label>
                  <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} style={{ fontSize: '13px' }} />
                  
                  {/* ГАЛОЧКА УДАЛЕНИЯ ФОТО (показываем только если фото уже есть) */}
                  {profileData.avatar_url && (
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', marginTop: '10px', color: '#dc3545' }}>
                      <input type="checkbox" checked={clearAvatar} onChange={e => setClearAvatar(e.target.checked)} style={{ marginRight: '5px' }} />
                      Smazat současnou fotku
                    </label>
                  )}
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Uživatelské jméno</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                </div>
              </fieldset>

              <fieldset style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <legend style={{ fontWeight: 'bold', color: '#28a745', padding: '0 10px' }}>Profile Details</legend>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Bio / About Me</label>
                  <textarea rows="3" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit' }}></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Birth Date</label>
                  <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>
              </fieldset>

              <button type="submit" className="btn-submit">Save All Changes</button>
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <span onClick={() => setIsEditing(false)} style={{ cursor: 'pointer', color: '#666', textDecoration: 'underline' }}>Cancel</span>
              </div>
            </form>
          )}
        </div>

        <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '10px', border: '1px solid #e9ecef' }}>
          <h3 style={{ color: '#333', fontSize: '18px', marginTop: 0, marginBottom: '15px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>Herní statistiky (Gamifikace)</h3>
          <p style={{ color: '#555', lineHeight: '2', margin: 0, fontSize: '15px' }}>
            <strong>Úroveň:</strong> <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '18px' }}>{profileData.level}</span><br/>
            <strong>Celkové XP:</strong> {profileData.points} XP<br/>
            <strong>Uložené články:</strong> {profileData.saved_count} ks
          </p>
          <div style={{ width: '100%', backgroundColor: '#ddd', height: '18px', borderRadius: '10px', overflow: 'hidden', marginTop: '30px' }}>
            <div style={{ width: `${progressPercent}%`, backgroundColor: '#28a745', height: '100%', transition: 'width 0.5s ease' }}></div>
          </div>
          <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>Pokrok: <strong>{profileData.current_level_progress} / 50 XP</strong></p>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 4. КОМПОНЕНТЫ ФОРУМА
// ==========================================
function ForumList({ isAuthenticated, setHideSearch, search, currentUsername }) {
  const [threads, setThreads] = useState([])
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => { setHideSearch(false) }, [])

  // ИСПРАВЛЕНО: Теперь этот хук следит за переменной [search]
  // Как только ты вводишь букву в шапке — форум тут же отправляет запрос бэкенду
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await axiosInstance.get(`${FORUM_URL}?q=${encodeURIComponent(search)}`)
        setThreads(res.data)
      } catch (e) { console.error(e) }
    }
    fetchThreads()
  }, [search]) // <--- КРИТИЧЕСКИ ВАЖНО тут указать search

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return alert("Musíte se přihlásit!")
    try {
      await axiosInstance.post(`${FORUM_URL}create/`, { title: newTitle })
      setNewTitle('')
      // Перезапрашиваем с учетом текущего поиска
      const res = await axiosInstance.get(`${FORUM_URL}?q=${encodeURIComponent(search)}`)
      setThreads(res.data)
    } catch (e) { alert("Chyba při vytváření vlákna") }
  }

  const handleDeleteThread = async (e, threadId) => {
    e.preventDefault() // Чтобы клик не переводил внутрь темы
    if (window.confirm("Opravdu smazat celé vlákno?")) {
      try {
        await axiosInstance.delete(`http://localhost:8000/api/forum/thread/${threadId}/delete/`);
        // Обновляем список, учитывая текущий поиск
        const res = await axiosInstance.get(`${FORUM_URL}?q=${encodeURIComponent(search)}`)
        setThreads(res.data)
      } catch (error) { alert("Chyba při mazání"); }
    }
  }

  return (
    <div className="content-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#2c3e50', textAlign: 'left' }}>Komunitní fórum</h2>
      {isAuthenticated && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="Název nového vlákna..." />
          <button type="submit" className="btn-submit" style={{ width: 'auto', marginTop: '0' }}>Založit vlákno</button>
        </form>
      )}
      {threads.map(t => (
        <Link key={t.id} to={`/forum/${t.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#007bff' }}>{t.title}</h3>
            {t.author === currentUsername && (
                <button onClick={(e) => handleDeleteThread(e, t.id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>✖ Smazat</button>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>Autor: {t.author} | {t.created_at} | Příspěvků: {t.post_count}</div>
        </Link>
      ))}
    </div>
  )
}

// ==========================================
// ДЕТАЛЬНАЯ СТРАНИЦА ФОРУМА
// ==========================================
// ИСПРАВЛЕНИЕ: Добавлен currentUserAvatar в список аргументов
function ForumThreadDetail({ isAuthenticated, setHideSearch, currentUsername, currentUserAvatar }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [thread, setThread] = useState(null)
  const [newPost, setNewPost] = useState('')

  useEffect(() => { setHideSearch(true) }, [])

  const fetchThread = async () => {
    try {
      const res = await axiosInstance.get(`${FORUM_URL}${id}/`)
      setThread(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchThread() }, [id])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return alert("Musíte se přihlásit!")
    try {
      await axiosInstance.post(`${FORUM_URL}${id}/post/`, { body: newPost })
      setNewPost('')
      fetchThread()
    } catch (e) { alert("Chyba") }
  }

  const handleDeletePost = async (postId) => {
    if (window.confirm("Opravdu smazat příspěvek?")) {
      try {
        await axiosInstance.delete(`http://localhost:8000/api/forum/post/${postId}/delete/`);
        fetchThread();
      } catch (error) { alert("Chyba při mazání"); }
    }
  }

  if (!thread) return <div className="content-container">Načítání...</div>

  return (
    <div className="content-container" style={{ maxWidth: '800px', background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', margin: '0 auto' }}>
      <button onClick={() => navigate('/forum')} style={{ background: 'none', border: 'none', color: '#555', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', fontSize: '16px', padding: 0 }}>← Zpět na fórum</button>
      <h2 style={{ color: '#2c3e50', textAlign: 'left', marginTop: 0 }}>{thread.title}</h2>
      <p style={{ color: '#888', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Založil: {thread.author} | {thread.created_at}</p>
      <div style={{ marginTop: '20px' }}>
        {thread.posts?.map(p => (
          <div key={p.id} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                
                {/* ИСПРАВЛЕННАЯ АВАТАРКА ЧУЖОГО ПОСТА В ФОРУМЕ */}
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #007bff 0%, #aa3bff 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden' }}>
                  {p.author_avatar ? (
                    <img src={p.author_avatar} alt={p.author} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    p.author ? p.author.charAt(0).toUpperCase() : 'U'
                  )}
                </div>              
                
                <div>
                <strong style={{ color: '#333' }}>{p.author}</strong> <span style={{ color: '#999', fontSize: '12px' }}>(Úroveň: {p.author_level})</span>
                {p.author === currentUsername && (
                  <button onClick={() => handleDeletePost(p.id)} style={{ color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', marginLeft: '10px' }}>[Smazat]</button>
                )}
              </div>
            </div>
            <div style={{ marginLeft: '42px', background: '#f1f1f1', padding: '10px 15px', borderRadius: '0 10px 10px 10px', display: 'inline-block' }}>{p.body}</div>
          </div>
        ))}
      </div>
      {isAuthenticated ? (
        <form onSubmit={handlePost} style={{ display: 'flex', gap: '15px', marginTop: '30px', background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #e9ecef' }}>
           
           {/* ИСПРАВЛЕННАЯ АВАТАРКА ВОЗЛЕ ВВОДА ПОСТА */}
           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #007bff 0%, #aa3bff 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', overflow: 'hidden' }}>
              {currentUserAvatar ? (
                <img src={currentUserAvatar} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U'
              )}
            </div>

           <div style={{ flexGrow: 1 }}>
            <input type="text" value={newPost} onChange={e => setNewPost(e.target.value)} required placeholder="Váš příspěvek..." style={{ marginBottom: '10px' }} />
            <button type="submit" className="btn-submit" style={{ width: 'auto', margin: 0, padding: '8px 20px' }}>Odeslat</button>
           </div>
        </form>
      ) : <p style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>Pro přidání příspěvku se musíte přihlásit.</p>}
    </div>
  )
}


// ==========================================
// NEW: КОМПОНЕНТ СТРАНИЦЫ ВХОДА (LOG IN)
// ==========================================
function LoginPage({ onAuthSuccess, setHideSearch }) {
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
    <div className="container">
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
      <div className="links">
        <Link to="/register">Create an account</Link>
        <br /><br />
        <Link to="/" style={{ color: '#999', fontSize: '12px' }}>Back to Home</Link>
      </div>
    </div>
  )
}

// ==========================================
// NEW: КОМПОНЕНТ СТРАНИЦЫ РЕГИСТРАЦИИ (SIGN UP)
// ==========================================
function RegisterPage({ onAuthSuccess, setHideSearch }) {
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
      // Если сервер вернул успех
      alert(response.data.message || "Registrace úspěšná!")
      await onAuthSuccess()
      navigate('/')
    } catch (error) {
      // Показываем ТОЧНЫЙ текст ошибки, который прислал Django
      const errorMsg = error.response?.data?.error || "Chyba při registraci. Zkuste to znovu.";
      alert("Chyba: " + errorMsg)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '450px' }}>
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
      <div className="links">
        Already have an account? <Link to="/login">Log in</Link>
        <br /><br />
        <Link to="/" style={{ color: '#999', fontSize: '12px' }}>Back to Home</Link>
      </div>
    </div>
  )
}

// ==========================================
// 5. ОСНОВНОЙ КОМПОНЕНТ APP
// ==========================================
function MainApp() {
  const [news, setNews] = useState([])
  const [search, setSearch] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [userAvatar, setUserAvatar] = useState(null)
  const [savedArticleIds, setSavedArticleIds] = useState([])
  const [readArticleIds, setReadArticleIds] = useState([]) // Память о прочитанном
  
  const [activeTab, setActiveTab] = useState('all') 
  const [activeCategory, setActiveCategory] = useState('') 
  const categories = ['Science', 'IT', 'Sport'] 
  const [hideSearch, setHideSearch] = useState(false)

  const handleLogout = async () => {
    try {
      // Говорим Джанго уничтожить сессию
      await axiosInstance.post(LOGOUT_URL);
      // Очищаем стейты в Реакте
      setIsAuthenticated(false);
      setUsername('');
      setUserAvatar(null);
      // Перезагружаем страницу, чтобы сбросить все данные
      window.location.href = '/'; 
    } catch (error) {
      console.error("Chyba při odhlášení", error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await axiosInstance.get(PROFILE_URL)
      setIsAuthenticated(true)
      setUsername(response.data.user.username)
      setUserAvatar(response.data.avatar_url)
      if (response.data.read_later) setSavedArticleIds(response.data.read_later.map(a => a.id))
      
      // ДОБАВЬ ВОТ ЭТУ СТРОЧКУ (Сохраняем историю из Джанго в Реакте):
      if (response.data.read_history) setReadArticleIds(response.data.read_history)
      
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
      {/* ЧИСТЫЙ НАВБАР БЕЗ ИНПУТОВ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <Link to="/" onClick={() => { setActiveCategory(''); setActiveTab('all'); setHideSearch(false); }} style={{ fontWeight: 'bold', fontSize: '20px', color: '#2c3e50', textDecoration: 'none' }}>
          NewsAggregator
        </Link>

        {!hideSearch && (
          <div className="search-wrapper">
            <form className="search-bar-final" onSubmit={(e) => { 
              e.preventDefault(); 
              // Если мы НЕ на форуме, то кнопка запускает поиск новостей
              if (!window.location.pathname.includes('/forum')) {
                fetchNews(search, activeCategory); 
              }
            }}>
              <input 
                type="text" 
                /* УМНЫЙ ПЛЕЙСХОЛДЕР: меняется в зависимости от страницы */
                placeholder={window.location.pathname.includes('/forum') ? "Search forum..." : "Search news..."} 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
              <button type="submit">🔍</button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/forum" style={{ marginRight: '20px', textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>Forum</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/profile" style={{ textDecoration: 'none', color: '#333', display: 'flex', alignItems: 'center', marginRight: '20px', background: 'white', padding: '5px 15px 5px 8px', borderRadius: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="NavNav" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #007bff 0%, #aa3bff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{username}</span>
              </Link>
              <button onClick={handleLogout} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Logout
              </button>            
              </>
          ) : (
            /* ЧИСТЫЕ СТИЛЬНЫЕ КНОПКИ ВМЕСТО ФОРМЫ */
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold', fontSize: '15px' }}>Log In</Link>
              <Link to="/register" style={{ textDecoration: 'none', backgroundColor: '#007bff', color: 'white', padding: '8px 18px', borderRadius: '5px', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 2px 5px rgba(0,123,255,0.2)' }}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      <div className="content-container">
        <Routes>
          <Route path="/" element={
            <>
              <div className="category-menu">
                <button onClick={() => { setActiveTab('all'); setActiveCategory(''); setHideSearch(false); }} className={`cat-btn ${activeTab === 'all' && activeCategory === '' ? 'active' : ''}`}>All News</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => { setActiveTab('all'); setActiveCategory(cat); setHideSearch(false); }} className={`cat-btn ${activeTab === 'all' && activeCategory === cat ? 'active' : ''}`}>{cat}</button>
                ))}
                {isAuthenticated && (
                  <button onClick={() => { setActiveTab('saved'); setActiveCategory(''); setHideSearch(false); }} className={`cat-btn ${activeTab === 'saved' ? 'active' : ''}`}>Přečíst později ({savedArticleIds.length})</button>
                )}
              </div>

              <div className="news-grid">
                {news.filter(n => activeTab === 'all' || savedArticleIds.includes(n.id)).map(item => (
                  <ShortNewsCard key={item.id} item={item} isSaved={savedArticleIds.includes(item.id)} onToggleSave={handleToggleSaveInParent} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            </>
          } />
          <Route path="/article/:id" element={<ArticleDetail isAuthenticated={isAuthenticated} onPointsAdded={checkAuthStatus} setHideSearch={setHideSearch} readArticleIds={readArticleIds} currentUsername={username} currentUserAvatar={userAvatar} />} />          
          <Route path="/profile" element={<UserProfilePage setHideSearch={setHideSearch} triggerAuthRefresh={checkAuthStatus} />} />
          <Route path="/forum" element={<ForumList isAuthenticated={isAuthenticated} setHideSearch={setHideSearch} search={search} currentUsername={username} />} />
          <Route path="/forum/:id" element={<ForumThreadDetail isAuthenticated={isAuthenticated} setHideSearch={setHideSearch} currentUsername={username} currentUserAvatar={userAvatar} />} />                    
          {/* НОВЫЕ ПОЛНОЦЕННЫЕ МАРШРУТЫ ДЛЯ СТРАНИЦ АВТОРИЗАЦИИ */}
          <Route path="/login" element={<LoginPage onAuthSuccess={checkAuthStatus} setHideSearch={setHideSearch} />} />
          <Route path="/register" element={<RegisterPage onAuthSuccess={checkAuthStatus} setHideSearch={setHideSearch} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default MainApp;