import { useState, useEffect } from 'react'
import questionsData from '../data/questions.json'

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random())
}

export default function App() {
  const [allData, setAllData]               = useState(null)
  const [view, setView]                     = useState('DASHBOARD')
  const [selectedParent, setSelectedParent] = useState(null)
  const [selectedSub, setSelectedSub]       = useState(null)
  const [session, setSession]               = useState([])
  const [qIndex, setQIndex]                 = useState(0)
  const [userAnswers, setUserAnswers]       = useState([])
  const [lastAnswer, setLastAnswer]         = useState(null)
  const [history, setHistory]               = useState([])
  const [reports, setReports]               = useState([])
  const [reportedIds, setReportedIds]       = useState(new Set())

  useEffect(() => {
    setAllData(questionsData)

    const saved = localStorage.getItem('muoiHistory')
    if (saved) setHistory(JSON.parse(saved))

    const savedReports = localStorage.getItem('muoiReports')
    if (savedReports) setReports(JSON.parse(savedReports))
  }, [])

  const saveHistory = (newHistory) => {
    setHistory(newHistory)
    localStorage.setItem('muoiHistory', JSON.stringify(newHistory))
  }

  const startQuiz = (parentKey, subKey) => {
    const pool = allData[parentKey].subtopics[subKey].questions
    const picked = shuffle(pool).slice(0, 10).map(q => ({
      ...q,
      options: shuffle(q.options),
    }))
    setSession(picked)
    setUserAnswers([])
    setQIndex(0)
    setLastAnswer(null)
    setSelectedParent(parentKey)
    setSelectedSub(subKey)
    setReportedIds(new Set())
    setView('QUIZ')
  }

  const reportQuestion = () => {
    const q = session[qIndex]
    const sub = allData[selectedParent].subtopics[selectedSub]
    const report = {
      id: q.id,
      question: q.question,
      hasImage: !!q.image,
      topic: sub.label,
      date: new Date().toLocaleDateString('vi-VN'),
    }
    const newReports = [report, ...reports.filter(r => r.id !== q.id)]
    setReports(newReports)
    localStorage.setItem('muoiReports', JSON.stringify(newReports))
    setReportedIds(prev => new Set([...prev, q.id]))
  }

  const clearReports = () => {
    setReports([])
    localStorage.removeItem('muoiReports')
  }

  const handleAnswer = (answer) => {
    const correct = session[qIndex].correct
    const isCorrect = answer === correct
    setUserAnswers(prev => [...prev, answer])
    setLastAnswer({ answer, correct, isCorrect })
    setView('FEEDBACK')
  }

  const nextQuestion = () => {
    if (qIndex + 1 < session.length) {
      setQIndex(i => i + 1)
      setLastAnswer(null)
      setView('QUIZ')
    } else {
      finishQuiz(userAnswers)
    }
  }

  const finishQuiz = (answers) => {
    let score = 0
    answers.forEach((a, i) => { if (a === session[i].correct) score++ })
    const perfect = score === session.length
    const attempt = {
      date: new Date().toLocaleDateString('vi-VN'),
      topic: allData[selectedParent].subtopics[selectedSub].label,
      score,
      total: session.length,
      perfect,
    }
    const newHistory = [attempt, ...history].slice(0, 20)
    saveHistory(newHistory)
    setView('RESULTS')
  }

  const exitQuiz = () => {
    setView('SUBTOPIC')
    setSession([])
    setUserAnswers([])
    setQIndex(0)
    setLastAnswer(null)
  }

  if (!allData) {
    return (
      <div className="app-container">
        <div className="card" style={{ textAlign: 'center', marginTop: '20vh' }}>
          <div style={{ fontSize: '4rem' }}>⏳</div>
          <h2>Đang tải dữ liệu...</h2>
        </div>
      </div>
    )
  }

  const goldCups   = history.filter(h => h.perfect).length
  const smellShoes = history.filter(h => !h.perfect).length

  // ── DASHBOARD ─────────────────────────────────────────────────────────────────
  if (view === 'DASHBOARD') {
    return (
      <div className="app-container">
        <div className="card">
          <h1 className="title">🌟 Muối Bảo Duy Ôn Tập 🌟</h1>
          <p className="subtitle">Bé chọn môn nào để ôn hôm nay?</p>

          <div className="parent-grid">
            {Object.entries(allData).map(([key, parent]) => (
              <button
                key={key}
                className={`btn-parent btn-${parent.color}`}
                onClick={() => { setSelectedParent(key); setView('SUBTOPIC') }}
              >
                <span className="btn-emoji">{parent.emoji}</span>
                <span>{parent.label}</span>
              </button>
            ))}
          </div>

          <div className="trophy-shelf">
            <h3>🏆 Tủ Kính Thành Tích 🏆</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              10 đúng = Cúp Vàng &nbsp;|&nbsp; Sai câu nào = Giày Bốc Mùi
            </p>
            <div className="trophies">
              <span>{goldCups} 🏆</span>
              <span>{smellShoes} 🥾</span>
            </div>
            {history.length > 0 && (
              <div className="history-list">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="history-row">
                    <span>{h.date}</span>
                    <span>{h.topic}</span>
                    <span style={{ fontWeight: 'bold', color: h.perfect ? 'var(--correct)' : 'var(--wrong)' }}>
                      {h.score}/{h.total} {h.perfect ? '🏆' : '🥾'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {reports.length > 0 && (
            <div className="reports-shelf">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>⚠️ Câu hỏi bị báo lỗi ({reports.length})</h3>
                <button className="btn-clear-reports" onClick={clearReports}>Xoá tất cả</button>
              </div>
              <div className="reports-list">
                {reports.map((r, i) => (
                  <div key={i} className="report-row">
                    <span className="report-date">{r.date}</span>
                    <span className="report-topic">{r.topic}</span>
                    <span className="report-q">{r.question.length > 45 ? r.question.slice(0, 45) + '…' : r.question}</span>
                    {r.hasImage && <span title="Có hình ảnh">🖼️</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SUBTOPIC PICKER ───────────────────────────────────────────────────────────
  if (view === 'SUBTOPIC') {
    const parent = allData[selectedParent]
    return (
      <div className="app-container">
        <div className="card">
          <button className="btn-back" onClick={() => setView('DASHBOARD')}>← Về trang chủ</button>
          <h2 className="title" style={{ fontSize: '2rem' }}>
            {parent.emoji} {parent.label}
          </h2>
          <p className="subtitle">Chọn chuyên đề để luyện tập:</p>

          <div className="sub-grid">
            {Object.entries(parent.subtopics).map(([key, sub]) => {
              const subAttempts = history.filter(h => h.topic === sub.label)
              const best = subAttempts.length > 0
                ? Math.max(...subAttempts.map(h => h.score))
                : null
              return (
                <button
                  key={key}
                  className={`btn-sub btn-${parent.color}`}
                  onClick={() => startQuiz(selectedParent, key)}
                >
                  <span className="sub-emoji">{sub.emoji}</span>
                  <span className="sub-label">{sub.label}</span>
                  <span className="sub-count">{sub.questions.length} câu</span>
                  {best !== null && (
                    <span className="sub-best">
                      Tốt nhất: {best}/10 {best === 10 ? '🏆' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────────
  if (view === 'QUIZ') {
    const q = session[qIndex]
    const sub = allData[selectedParent].subtopics[selectedSub]
    const progress = (qIndex / session.length) * 100

    return (
      <div className="app-container">
        <div className="card">
          <div className="quiz-header">
            <button className="btn-exit" onClick={exitQuiz}>✕ Thoát</button>
            <span className="quiz-topic-tag">{sub.emoji} {sub.label}</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-label">Câu {qIndex + 1} / {session.length}</p>

          <div className="question-text">{q.question}</div>

          {q.image ? <img src={q.image} alt="Hình minh hoạ" className="question-image" /> : null}

          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <button
              className={`btn-report${reportedIds.has(q.id) ? ' reported' : ''}`}
              onClick={reportQuestion}
              disabled={reportedIds.has(q.id)}
            >
              {reportedIds.has(q.id) ? '✓ Đã ghi nhận báo lỗi' : '⚠️ Không xem được hình / Không đọc được câu'}
            </button>
          </div>

          <div className="options-grid">
            {q.options.map((opt, i) => (
              <button key={i} className="option-btn" onClick={() => handleAnswer(opt)}>
                <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── FEEDBACK ──────────────────────────────────────────────────────────────────
  if (view === 'FEEDBACK') {
    const { answer, correct, isCorrect } = lastAnswer
    const isLast = qIndex + 1 >= session.length
    const q = session[qIndex]

    return (
      <div className="app-container">
        <div className="card feedback-card">
          <div className={`feedback-banner ${isCorrect ? 'correct' : 'wrong'}`}>
            <span className="feedback-emoji">{isCorrect ? '✅' : '❌'}</span>
            <span>{isCorrect ? 'Đúng rồi!' : 'Chưa đúng!'}</span>
          </div>

          {!isCorrect && (
            <div className="feedback-detail">
              <p className="feedback-question-text">{q.question}</p>
              {q.image && <img src={q.image} alt="Hình minh hoạ" className="feedback-question-image" />}
              <p>Muối Bảo Duy chọn: <span className="wrong-ans">{answer}</span></p>
              <p>Đáp án đúng: <span className="correct-ans">{correct}</span></p>
            </div>
          )}

          <button className="btn-bubbly" style={{ marginTop: '30px' }} onClick={nextQuestion}>
            {isLast ? '🏁 Xem kết quả' : 'Câu tiếp theo →'}
          </button>
        </div>
      </div>
    )
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────────
  if (view === 'RESULTS') {
    let score = 0
    const mistakes = []
    userAnswers.forEach((ans, i) => {
      if (ans === session[i].correct) {
        score++
      } else {
        mistakes.push({ q: session[i].question, image: session[i].image || null, you: ans, correct: session[i].correct })
      }
    })
    const isPerfect = score === session.length

    return (
      <div className="app-container">
        <div className="card">
          <h1 className="title" style={{ color: isPerfect ? 'var(--secondary)' : 'var(--shoe)' }}>
            {isPerfect ? 'TUYỆT VỜI! 🎉' : 'CỐ LÊN NÀO! 💪'}
          </h1>

          <div className="celebration">
            <div className="big-emoji">{isPerfect ? '🏆' : '🥾'}</div>
          </div>

          <h2 style={{ textAlign: 'center' }}>
            Muối Bảo Duy đúng <strong>{score}</strong>/{session.length} câu
          </h2>
          <p style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
            {isPerfect ? 'Xuất sắc! Muối Bảo Duy được thưởng 1 Cúp Vàng! 🏆' : 'Không sao! Ôn lại và thử lại nhé! 😊'}
          </p>

          {mistakes.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3>📖 Các câu cần ôn lại:</h3>
              {mistakes.map((m, i) => (
                <div key={i} className="review-item">
                  <div className="review-question">{m.q}</div>
                  {m.image && <img src={m.image} alt="Hình minh hoạ" className="review-image" />}
                  <div className="review-wrong">Muối Bảo Duy chọn: {m.you}</div>
                  <div className="review-correct">Đáp án đúng: {m.correct}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
            <button
              className={`btn-bubbly btn-${allData[selectedParent].color}`}
              style={{ flex: 1 }}
              onClick={() => startQuiz(selectedParent, selectedSub)}
            >
              🔄 Làm lại
            </button>
            <button
              className="btn-bubbly"
              style={{ flex: 1, background: '#888', boxShadow: '0 6px 0 #555' }}
              onClick={() => setView('SUBTOPIC')}
            >
              📚 Chọn chủ đề
            </button>
            <button
              className="btn-bubbly"
              style={{ flex: 1, background: '#4a90d9', boxShadow: '0 6px 0 #2c6fad' }}
              onClick={() => setView('DASHBOARD')}
            >
              🏠 Trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
