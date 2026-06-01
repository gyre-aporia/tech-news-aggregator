import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { axiosInstance, API_URL, POINTS_URL } from '../api/config'
import { cleanHtml } from '../utils/helpers'
import './ArticleDetail.css'

export default function ArticleDetail({ isAuthenticated, onPointsAdded, setHideSearch, readArticleIds, currentUsername, currentUserAvatar }) {
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
      if (isRefresh) return
      
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
          if (prev <= 1) { clearInterval(timerRef.current); return 0 }
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

  const getBeltClass = (level) => {
  if (level >= 10) return 'belt-black';
  if (level >= 8) return 'belt-red';
  if (level >= 6) return 'belt-blue';
  if (level >= 4) return 'belt-green';
  if (level >= 2) return 'belt-yellow';
  return 'belt-white';
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Opravdu chcete smazat tento komentář?")) {
      try {
        await axiosInstance.delete(`http://localhost:8000/api/comment/${commentId}/delete/`)
        fetchDetail(true)
      } catch (error) { alert("Chyba při mazání") }
    }
  }
  
  if (!article) return <div className="content-container">Načítání...</div>

  return (
    <div className="page-box">
      <button className="btn-back" onClick={() => navigate(-1)}>← Zpět</button>
      <div>
        <span className="source-tag" style={{ background: '#007bff', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{article.category_name || 'Zprávy'}</span>
        <span className="text-muted" style={{ marginLeft: '10px' }}>Zdroj: {article.source}</span>
      </div>
      <h1 style={{ fontSize: '32px', margin: '15px 0', color: '#222' }}>{article.title}</h1>
      {article.image_url && <img src={article.image_url} alt="Article" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '25px' }} />}
      <div className="article-content" dangerouslySetInnerHTML={{ __html: cleanHtml(article.description) }} />
      <a href={article.link} target="_blank" rel="noreferrer" className="btn-original-link">Číst originál ↗</a>
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '10px', textAlign: 'center', border: '1px solid #e9ecef' }}>
        <button disabled={timeLeft > 0 || isRead} onClick={handleMarkAsRead} className="btn-submit" style={{ width: 'auto', padding: '12px 30px', background: isRead ? '#28a745' : timeLeft > 0 ? '#6c757d' : '#007bff' }}>
          {isRead ? '✓ Přečteno (+10 XP)' : timeLeft > 0 ? `Čtěte ještě ${timeLeft}s pro XP` : 'Označit jako přečtené (+10 XP)'}
        </button>
      </div>
      <hr style={{ margin: '50px 0', borderTop: '1px solid #eee' }} />
      
      <h3>Komentáře ({article.comments?.length || 0})</h3>
      {isAuthenticated ? (
        <form onSubmit={handlePostComment} className="comment-form-box">
          <div className="avatar-gradient avatar-md">
            {currentUserAvatar ? <img src={currentUserAvatar} alt="Me" className="avatar-img" /> : (currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U')}
          </div>
          <div style={{ flexGrow: 1 }}>
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} required placeholder="Napište komentář..." style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
            <button type="submit" className="btn-submit" style={{ width: 'auto', margin: 0, padding: '8px 20px' }}>Odeslat</button>
          </div>
        </form>
      ) : <p style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px' }}>Pro přidání komentáře se musíte přihlásit.</p>}
      
      {article.comments?.map(c => (
        <div key={c.id} className={`comment-card margin-b-20 ${getBeltClass(c.author_level)}`}>
            <div className="flex-align-center" style={{ marginBottom: '10px' }}>
            <div className={`avatar-gradient avatar-sm ${c.author_level > 3 ? 'avatar-gold-border' : ''}`}>
                {c.author_avatar ? <img src={c.author_avatar} alt={c.author} className="avatar-img" /> : (c.author ? c.author.charAt(0).toUpperCase() : 'U')}
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong style={{ color: '#333' }}>{c.author}</strong>
                <span className="text-muted" style={{ marginLeft: '5px', fontSize: '12px' }}>
                Pás: {c.author_level}
                </span>
                {c.author === currentUsername && (
                <button onClick={() => handleDeleteComment(c.id)} className="btn-delete-text" style={{ marginLeft: '10px' }}>[Smazat]</button>
                )}
            </div>
            </div>
            <div className="comment-bubble">{c.text}</div>
        </div>
        ))}
    </div>
  )
}