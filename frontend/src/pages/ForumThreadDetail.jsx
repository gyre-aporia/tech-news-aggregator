import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { axiosInstance, FORUM_URL } from '../api/config'
import './Forum.css'

export default function ForumThreadDetail({ isAuthenticated, setHideSearch, currentUsername, currentUserAvatar }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [thread, setThread] = useState(null)
  const [newPost, setNewPost] = useState('')

  const getBeltClass = (level) => {
    if (level >= 10) return 'belt-black';
    if (level >= 8) return 'belt-red';
    if (level >= 6) return 'belt-blue';
    if (level >= 4) return 'belt-green';
    if (level >= 2) return 'belt-yellow';
    return 'belt-white';
  };

  useEffect(() => { setHideSearch(true) }, [setHideSearch])

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
        await axiosInstance.delete(`http://localhost:8000/api/forum/post/${postId}/delete/`)
        fetchThread()
      } catch (error) { alert("Chyba při mazání") }
    }
  }

  if (!thread) return <div className="content-container">Načítání...</div>

  return (
    <div className="page-box">
      <button className="btn-back" onClick={() => navigate('/forum')}>← Zpět na fórum</button>
      
      {/* Заголовок и мета-информация */}
      <h2 style={{ color: '#2c3e50', textAlign: 'left', marginTop: 0 }}>{thread.title}</h2>
      <p className="text-muted" style={{ borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        Založil: {thread.author} | {thread.created_at}
      </p>
      
      {/* Блок описания (выводится, только если оно есть) */}
      {thread.description && (
        <div style={{ 
          background: '#ffffff', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0', 
          marginTop: '20px', 
          fontSize: '15px', 
          lineHeight: '1.6', 
          color: '#2d3748',
          whiteSpace: 'pre-wrap',       /* Сохраняет абзацы (Enter) */
          overflowWrap: 'break-word',   /* Перенос длинных слов */
          wordWrap: 'break-word',
          wordBreak: 'break-word'
        }}>
          {thread.description}
        </div>
      )}
      
      {/* Список комментариев / постов */}
      <div style={{ marginTop: '30px' }}>
        {thread.posts?.map(p => (
          <div key={p.id} className={`comment-card margin-b-20 ${getBeltClass(p.author_level)}`}>
            <div className="flex-align-center" style={{ marginBottom: '10px' }}>
                <div className={`avatar-gradient avatar-sm ${p.author_level > 3 ? 'avatar-gold-border' : ''}`}>
                  {p.author_avatar ? <img src={p.author_avatar} alt={p.author} className="avatar-img" /> : (p.author ? p.author.charAt(0).toUpperCase() : 'U')}
                </div>              
                <div style={{ marginLeft: '10px' }}>
                <strong style={{ color: '#333' }}>{p.author}</strong> 
                <span className="text-muted" style={{ marginLeft: '5px', fontSize: '12px' }}>
                  Pás: {p.author_level}
                </span>
                {p.author === currentUsername && (
                  <button onClick={() => handleDeletePost(p.id)} className="btn-delete-text" style={{ marginLeft: '10px' }}>[Smazat]</button>
                )}
              </div>
            </div>
            <div className="comment-bubble">{p.body}</div>
          </div>
        ))}
      </div>
      
      {/* Форма отправки нового поста */}
      {isAuthenticated ? (
        <form onSubmit={handlePost} className="comment-form-box">
           <div className="avatar-gradient avatar-md">
              {currentUserAvatar ? <img src={currentUserAvatar} alt="Me" className="avatar-img" /> : (currentUsername ? currentUsername.charAt(0).toUpperCase() : 'U')}
            </div>
           <div style={{ flexGrow: 1 }}>
            <input type="text" value={newPost} onChange={e => setNewPost(e.target.value)} required placeholder="Váš příspěvek..." style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }} />
            <button type="submit" className="btn-submit" style={{ width: 'auto', margin: 0, padding: '8px 20px' }}>Odeslat</button>
           </div>
        </form>
      ) : <p style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>Pro přidání příspěvku se musíte přihlásit.</p>}
    </div>
  )
}