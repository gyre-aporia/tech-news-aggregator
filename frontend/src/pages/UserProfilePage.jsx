import { useState, useEffect } from 'react'
import { axiosInstance, PROFILE_URL } from '../api/config'
import './UserProfilePage.css'

export default function UserProfilePage({ setHideSearch, triggerAuthRefresh, news = [] }) {
  const [profileData, setProfileData] = useState(null)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ username: '', email: '', bio: '', birthDate: '', preferredCategories: [] })
  const [avatarFile, setAvatarFile] = useState(null)
  const [clearAvatar, setClearAvatar] = useState(false)

  const availableCategories = ['Science', 'IT', 'Sport']

  useEffect(() => { setHideSearch(true) }, [setHideSearch])

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get(PROFILE_URL)
      setProfileData(response.data)
      setFormData({
        username: response.data.user.username || '',
        email: response.data.user.email || '',
        bio: response.data.bio || '',
        birthDate: response.data.birth_date || '',
        preferredCategories: response.data.preferred_categories ? response.data.preferred_categories.map(c => c.name) : []
      })
    } catch (err) { setError('Nepodařilo se načíst data profilu.') }
  }

  useEffect(() => { fetchProfile() }, [])

  const toggleCategory = (cat) => {
    setFormData(prev => {
      const isSelected = prev.preferredCategories.includes(cat)
      return {
        ...prev,
        preferredCategories: isSelected
          ? prev.preferredCategories.filter(c => c !== cat)
          : [...prev.preferredCategories, cat]
      }
    })
  }

  const handleSaveAllChanges = async (e) => {
    e.preventDefault()
    try {
      const submitData = new FormData()
      submitData.append('username', formData.username)
      submitData.append('email', formData.email)
      submitData.append('bio', formData.bio)
      submitData.append('birthDate', formData.birthDate)
      
      formData.preferredCategories.forEach(cat => {
        submitData.append('preferred_categories', cat)
      })

      if (avatarFile) submitData.append('avatar', avatarFile)
      if (clearAvatar) submitData.append('clear_avatar', 'true')

      await axiosInstance.post(PROFILE_URL, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      alert("Změny byly úspěšně uloženy!")
      setIsEditing(false)
      setAvatarFile(null)
      setClearAvatar(false)
      fetchProfile()
      triggerAuthRefresh() 
    } catch (err) { alert("Chyba při ukládání změn.") }
  }

  if (error) return <div className="content-container" style={{ color: '#dc3545' }}>{error}</div>
  if (!profileData) return <div className="content-container">Načítání profilu...</div>

  const progressPercent = Math.min(100, (profileData.current_level_progress / 50) * 100)

  const readNews = news.filter(n => profileData.read_history.includes(n.id))
  const categoryStats = {}
  readNews.forEach(n => {
    const cat = n.category_name || 'Ostatní'
    categoryStats[cat] = (categoryStats[cat] || 0) + 1
  })
  const totalRead = readNews.length

  const colors = ['#0d6efd', '#20c997', '#ffc107', '#fd7e14', '#6f42c1', '#e83e8c']
  let currentAngle = 0
  
  const chartSegments = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([cat, count], index) => {
    const percentage = (count / totalRead) * 100
    const start = currentAngle
    currentAngle += percentage
    return { 
      cat, 
      count, 
      percentage, 
      color: colors[index % colors.length], 
      start, 
      end: currentAngle 
    }
  })

  const getBeltClass = (level) => {
  if (level >= 10) return 'belt-black';
  if (level >= 8) return 'belt-red';
  if (level >= 6) return 'belt-blue';
  if (level >= 4) return 'belt-green';
  if (level >= 2) return 'belt-yellow';
  return 'belt-white';
  };

  const conicGradient = chartSegments.length > 0 
    ? chartSegments.map(seg => `${seg.color} ${seg.start}% ${seg.end}%`).join(', ')
    : '#eee 0% 100%'

  return (
    <div className="profile-box">
      <div className="avatar-gradient avatar-lg">
        {profileData.avatar_url ? <img src={profileData.avatar_url} alt="Avatar" className="avatar-img" /> : profileData.user.username.charAt(0).toUpperCase()}
      </div>
      <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '32px' }}>{profileData.user.username}</h1>
      <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '30px 0' }} />
      
      <div className="profile-grid">
        <div className="profile-panel">
          {!isEditing ? (
            <>
              <h3>Osobní údaje</h3>
              <p style={{ color: '#555', lineHeight: '2', margin: 0, fontSize: '15px' }}>
                <strong>Uživatelské jméno:</strong> {profileData.user.username}<br/>
                <strong>E-mail:</strong> {profileData.user.email}<br/>
                <strong>Datum registrace:</strong> {profileData.user.date_joined}<br/>
                <strong>Bio / About Me:</strong> {profileData.bio || 'nic'}<br/>
                <strong>Birth Date:</strong> {profileData.birth_date || 'dd.mm.rrrr'}<br/>
                <strong>Můj výběr:</strong> {profileData.preferred_categories && profileData.preferred_categories.length > 0 ? profileData.preferred_categories.map(c => c.name).join(', ') : 'Žádná oblíbená témata'}
              </p>
              <button onClick={() => setIsEditing(true)} className="btn-submit" style={{ marginTop: '25px' }}>Edit Profile</button>
            </>
          ) : (
            <form onSubmit={handleSaveAllChanges}>
              <h2 style={{ fontSize: '22px', marginBottom: '20px', marginTop: 0, color: '#333' }}>Edit Profile</h2>
              
              <fieldset style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <legend style={{ fontWeight: 'bold', color: '#007bff', padding: '0 10px' }}>Account Info</legend>
                <div style={{ marginBottom: '15px', background: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Profilová fotka</label>
                  <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} style={{ fontSize: '13px' }} />
                  {profileData.avatar_url && (
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', marginTop: '10px', color: '#dc3545' }}>
                      <input type="checkbox" checked={clearAvatar} onChange={e => setClearAvatar(e.target.checked)} style={{ marginRight: '5px' }} />
                      Smazat současnou fotku
                    </label>
                  )}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Uživatelské jméno</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }}/>
                </div>
              </fieldset>

              <fieldset style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <legend style={{ fontWeight: 'bold', color: '#28a745', padding: '0 10px' }}>Profile Details & Zájmy</legend>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Můj výběr (Oblíbené kategorie)</label>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', background: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                    {availableCategories.map(cat => (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.preferredCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          style={{ marginRight: '5px' }}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Bio / About Me</label>
                  <textarea rows="3" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'inherit', boxSizing: 'border-box' }}></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '13px' }}>Birth Date</label>
                  <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxSizing: 'border-box' }}/>
                </div>
              </fieldset>
              
              <button type="submit" className="btn-submit">Save All Changes</button>
              
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <span onClick={() => setIsEditing(false)} style={{ cursor: 'pointer', color: '#666', textDecoration: 'underline' }}>Cancel</span>
              </div>
            </form>
          )}
        </div>
        
        <div className={`profile-panel ${getBeltClass(profileData.level)}`}>
          <h3>Herní statistiky (Gamifikace)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '15px', color: '#555' }}>
            <div><strong>Úroveň:</strong> <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '18px' }}>{profileData.level}</span></div>
            <div><strong>Celkové XP:</strong> {profileData.points} XP</div>
          </div>
          
          <div className="progress-bar-bg" style={{ marginBottom: '8px' }}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="text-muted" style={{ textAlign: 'center', margin: '0 0 35px 0', fontSize: '13px' }}>Pokrok: <strong>{profileData.current_level_progress} / 50 XP</strong></p>

          <h3 style={{ marginBottom: '20px' }}>Analýza vašeho čtení</h3>
          
          {totalRead > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px', background: '#f8f9fa', padding: '20px', borderRadius: '12px' }}>
              <div style={{
                width: '130px', 
                height: '130px',
                borderRadius: '50%',
                background: `conic-gradient(${conicGradient})`,
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <div style={{
                  width: '90px', 
                  height: '90px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '50%',
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  flexDirection: 'column'
                }}>
                   <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', lineHeight: '1' }}>{totalRead}</span>
                   <span style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>článků</span>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                {chartSegments.map(seg => (
                  <div key={seg.cat} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ width: '14px', height: '14px', backgroundColor: seg.color, borderRadius: '4px', marginRight: '12px', flexShrink: 0 }}></span>
                    <span style={{ flex: 1, fontSize: '15px', color: '#444', fontWeight: '600' }}>{seg.cat}</span>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#222' }}>{Math.round(seg.percentage)}%</span>
                    <span style={{ fontSize: '13px', color: '#888', marginLeft: '6px', fontWeight: '500' }}>({seg.count})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
              <p className="text-muted" style={{ margin: 0 }}>Zatím jste nečetli žádné články. Až si nějaké přečtete, objeví se zde vaše statistiky témat!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}