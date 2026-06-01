import { useState } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance, TOGGLE_SAVE_URL } from '../api/config'
import { cleanHtml } from '../utils/helpers'
import './ShortNewsCard.css'

export default function ShortNewsCard({ item, isSaved, onToggleSave, isAuthenticated }) {
  const [saved, setSaved] = useState(isSaved)

  const handleSave = async (e) => {
    e.preventDefault()
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
      
      <div className="card-image-wrapper">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} />
        ) : (
          <img src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600" alt="Fallback" />
        )}
      </div>
      
      <div className="card-body">
        
        <div className="card-header-top">
          <div className="card-tags-wrapper">
            <span className="source-tag">{item.source}</span>

            {item.category_name && (
              <span className="category-tag">
                {item.category_name}
              </span>
            )}
            <span style={{fontWeight: 'bold'}}>Komentáře:</span>
            <span style={{ color: 'blue', fontWeight: 'bold'}}>
                {item.comment_count !== undefined ? item.comment_count : 'Does not have data'}
            </span>
          </div>
          <button 
            onClick={handleSave} 
            className={`save-btn ${saved ? 'is-saved' : ''}`}
          >
            {saved ? '★' : '☆'}
          </button>
        </div>

        <h3 className="card-title">{item.title}</h3>
        
        <p className="text-muted card-description" dangerouslySetInnerHTML={{ __html: cleanHtml(item.description) }} />
        
        <div className="card-buttons">
          <a href={item.link} target="_blank" rel="noreferrer" className="btn-source">
            Source ↗
          </a>
          <Link to={`/article/${item.id}`} className="btn-submit">
            Discuss
          </Link>
        </div>

      </div>
    </div>
  )
}