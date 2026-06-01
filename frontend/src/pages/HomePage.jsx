import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ShortNewsCard from '../components/ShortNewsCard'

export default function HomePage({
  news,
  activeTab,
  setActiveTab,
  activeCategory,
  setActiveCategory,
  categories,
  isAuthenticated,
  savedArticleIds,
  setHideSearch,
  handleToggleSaveInParent,
  search,
  preferredCategories
}) {
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    setHideSearch(false)
  }, [setHideSearch])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, activeCategory, search])

  const getSortedAndFilteredNews = () => {
    let result = news

    if (activeTab === 'saved') {
      result = news.filter(n => savedArticleIds.includes(n.id))
    } else if (activeTab === 'my_selection') {
      result = news.filter(n => preferredCategories.includes(n.category_name))
    } else if (activeCategory) {
      result = news.filter(n => n.category_name === activeCategory)
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
      if (sortBy === 'source') return (a.source || '').localeCompare(b.source || '')
      if (sortBy === 'comments') return (Number(b.comment_count) || 0) - (Number(a.comment_count) || 0)
      return 0
    })
  }

  const displayedNews = getSortedAndFilteredNews()
  
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentNews = displayedNews.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(displayedNews.length / itemsPerPage)

  return (
    <>
      <div className="home-toolbar" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ flex: 1 }}></div>
        <div className="category-menu" style={{ margin: 0, padding: 0, justifyContent: 'center' }}>
          <button onClick={() => { setActiveTab('all'); setActiveCategory(''); }} className={`cat-btn ${activeTab === 'all' && activeCategory === '' ? 'active' : ''}`}>All News</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setActiveTab('all'); setActiveCategory(cat); }} className={`cat-btn ${activeTab === 'all' && activeCategory === cat ? 'active' : ''}`}>
              {cat}
            </button>
          ))}
          {isAuthenticated && (
            <>
              <button onClick={() => { setActiveTab('my_selection'); setActiveCategory(''); }} className={`cat-btn ${activeTab === 'my_selection' ? 'active' : ''}`}>Můj výběr</button>
              <button onClick={() => { setActiveTab('saved'); setActiveCategory(''); }} className={`cat-btn ${activeTab === 'saved' ? 'active' : ''}`}>Přečíst později ({savedArticleIds.length})</button>
            </>
          )}
        </div>
        <div className="sort-wrapper" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Řadit podle:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid #ddd', background: 'white', fontWeight: 'bold', color: '#555', cursor: 'pointer', outline: 'none' }}>
            <option value="newest">Nejnovější</option>
            <option value="title">Abecedy (A-Z)</option>
            <option value="source">Zdroje</option>
            <option value="comments">Popularity (Komentářů)</option>
          </select>
        </div>
      </div>

      {search && (
        <div style={{ background: '#e3f2fd', padding: '15px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bbdefb' }}>
          <span style={{ color: '#0d47a1', fontSize: '15px', fontWeight: '500' }}>Hledáte <strong>"{search}"</strong>.</span>
          <Link to="/forum" style={{ background: '#0d47a1', color: 'white', padding: '8px 15px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Prohledat fórum ↗</Link>
        </div>
      )}

      <div className="news-grid">
        {currentNews.length > 0 ? (
          currentNews.map(item => (
            <ShortNewsCard key={item.id} item={item} isSaved={savedArticleIds.includes(item.id)} onToggleSave={handleToggleSaveInParent} isAuthenticated={isAuthenticated} />
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888', background: 'white', borderRadius: '10px' }}>
            Zadaným kritériím neodpovídají žádné zprávy.
          </div>
        )}
      </div>

            {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', marginBottom: '40px' }}>
            <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: currentPage === 1 ? '#edf2f7' : '#0d6efd',
                color: currentPage === 1 ? '#a0aec0' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
            }}
            >
            &larr; Předchozí
            </button>
            
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#4a5568' }}>
            Stránka {currentPage} z {totalPages}
            </span>
            
            <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: currentPage === totalPages ? '#edf2f7' : '#0d6efd',
                color: currentPage === totalPages ? '#a0aec0' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
            }}
            >
            Další &rarr;
            </button>
        </div>
        )}
    </>
  )
}