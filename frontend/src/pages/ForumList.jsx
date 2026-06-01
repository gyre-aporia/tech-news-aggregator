import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance, FORUM_URL } from '../api/config'
import './Forum.css'

export default function ForumList({ isAuthenticated, setHideSearch, search, currentUsername }) {
  const [threads, setThreads] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('Ostatní')
  
  const [activeFilter, setActiveFilter] = useState('Vše')
  const availableCategories = ['IT', 'Sport', 'Science', 'Ostatní']

  useEffect(() => {
    setHideSearch(false)
  }, [setHideSearch])

  const fetchThreads = async () => {
    try {
      const res = await axiosInstance.get(`${FORUM_URL}?q=${encodeURIComponent(search)}`)
      setThreads(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchThreads()
  }, [search])

  const handleVote = async (e, threadId, voteType) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) return alert("Pro hlasování se musíte přihlásit!")
    try {
      await axiosInstance.post(`/api/forum/thread/${threadId}/vote/`, { vote_type: voteType })
      await fetchThreads()
    } catch (e) {
      console.error(e)
      alert("Chyba při hlasování")
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return alert("Pro vytvoření se musíte přihlásit!")
    try {
      await axiosInstance.post(`${FORUM_URL}create/`, { 
        title: newTitle, 
        category: newCategory,
        description: newDescription 
      })
      setNewTitle('')
      setNewDescription('')
      setNewCategory('Ostatní') 
      fetchThreads()
    } catch (e) { alert("Chyba při vytváření vlákna") }
  }

  const handleDeleteThread = async (e, threadId) => {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm("Opravdu smazat celé vlákno?")) {
      try {
        await axiosInstance.delete(`http://localhost:8000/api/forum/thread/${threadId}/delete/`)
        fetchThreads()
      } catch (error) {
        alert("Chyba při mazání")
      }
    }
  }

  const displayedThreads = activeFilter === 'Vše' 
    ? threads 
    : threads.filter(t => t.category === activeFilter)

  return (
    <div className="page-box">
      <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Komunitní fórum</h2>
      
      {isAuthenticated && (
        <form onSubmit={handleCreate} className="comment-form-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={newCategory} 
              onChange={e => setNewCategory(e.target.value)}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', background: '#fff' }}
            >
              {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            
            <input 
              type="text" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)} 
              required 
              placeholder="Název nového vlákna..." 
              style={{ flexGrow: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} 
            />
          </div>
          
          <textarea 
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="Popište své téma podrobněji (volitelné)..."
            rows="3"
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'vertical' }}
          ></textarea>
          
          <button type="submit" className="btn-submit" style={{ alignSelf: 'flex-start' }}>Založit vlákno</button>
        </form>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveFilter('Vše')} 
          style={{ 
            padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
            background: activeFilter === 'Vše' ? '#0d6efd' : '#e2e8f0', 
            color: activeFilter === 'Vše' ? 'white' : '#4a5568' 
          }}
        >
          Vše
        </button>
        {availableCategories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveFilter(cat)} 
            style={{ 
              padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
              background: activeFilter === cat ? '#0d6efd' : '#e2e8f0', 
              color: activeFilter === cat ? 'white' : '#4a5568' 
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {displayedThreads.length > 0 ? (
        displayedThreads.map((t) => (
          <div key={t.id} className="thread-card" style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '10px', marginBottom: '10px', background: '#fff' }}>
            <div className="vote-box" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', background: '#f7fafc', padding: '8px 15px', borderRadius: '20px' }}>
              <button onClick={(e) => handleVote(e, t.id, 'down')} style={{ color: t.has_downvoted ? '#e53e3e' : '#718096', fontWeight: t.has_downvoted ? 'bold' : 'normal', border: 'none', background: 'none', cursor: 'pointer' }}>▼</button>
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#2d3748', minWidth: '30px', textAlign: 'center' }}>{t.upvotes - t.downvotes}</span>
              <button onClick={(e) => handleVote(e, t.id, 'up')} style={{ color: t.has_upvoted ? '#3182ce' : '#718096', fontWeight: t.has_upvoted ? 'bold' : 'normal', border: 'none', background: 'none', cursor: 'pointer' }}>▲</button>
            </div>

            <h3 style={{ margin: '0', fontSize: '18px', color: '#2d3748' }}>
              <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '3px 8px', borderRadius: '12px', marginRight: '10px', color: '#4a5568' }}>
                {t.category}
              </span>
            </h3>

            <Link to={`/forum/${t.id}`} style={{ flex: 1, textDecoration: 'none', marginLeft: '20px', color: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0', fontSize: '18px', color: '#2d3748' }}>{t.title}</h3>
                {t.author === currentUsername && (
                  <button onClick={(e) => handleDeleteThread(e, t.id)} style={{ fontSize: '12px', color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer' }}>✖ Smazat</button>
                )}
              </div>
              <div className="thread-meta" style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                <strong>{t.author}</strong> • {t.created_at} • {t.post_count} příspěvků
              </div>
            </Link>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: '#f8f9fa', borderRadius: '10px', marginTop: '20px' }}>
          V této kategorii zatím nejsou žádná vlákna. Buďte první!
        </div>
      )}
    </div>
  )
}