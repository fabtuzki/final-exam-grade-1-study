import { useState, useEffect } from 'react'
import questionsData from '../data/questions.json'

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random())
}

function buildSession(allData) {
  const subtopics = []
  for (const [pk, parent] of Object.entries(allData)) {
    for (const [sk, sub] of Object.entries(parent.subtopics)) {
      const taggedQs = sub.questions.map(q => ({
        ...q,
        parentKey: pk,
        subKey: sk,
        parentLabel: parent.label,
        subLabel: sub.label,
        subEmoji: sub.emoji,
      }))
      subtopics.push(taggedQs)
    }
  }
  // Guarantee 1 question per subtopic
  let picked = subtopics.map(qs => shuffle(qs)[0])
  const pickedIds = new Set(picked.map(q => q.id))
  // Fill to 10 with random remaining
  const remaining = subtopics.flat().filter(q => !pickedIds.has(q.id))
  const extra = shuffle(remaining).slice(0, Math.max(0, 10 - picked.length))
  picked = shuffle([...picked, ...extra])
  return picked.map(q => ({ ...q, options: shuffle(q.options) }))
}

export default function App() {
  const [allData, setAllData]             = useState(null)
  const [view, setView]                   = useState('DASHBOARD')
  const [session, setSession]             = useState([])
  const [qIndex, setQIndex]               = useState(0)
  const [userAnswers, setUserAnswers]     = useState([])
  const [lastAnswer, setLastAnswer]       = useState(null)
  const [history, setHistory]             = useState([])
  const [reports, setReports]             = useState([])
  const [reportedIds, setReportedIds]     = useState(new Set())
  const [questionStats, setQuestionStats] = useState({})

  useEffect(() => {
    setAllData(questionsData)

    const saved = localStorage.getItem('muoiHistory')
    if (saved) setHistory(JSON.parse(saved))

    const savedReports = localStorage.getItem('muoiReports')
    if (savedReports) setReports(JSON.parse(savedReports))

    const savedStats = localStorage.getItem('muoiQuestionStats')
    if (savedStats) setQuestionStats(JSON.parse(savedStats))
  }, [])

  const startQuiz = () => {
    const picked = buildSession(allData)
    setSession(picked)
    setUserAnswers([])
    setQIndex(0)
    setLastAnswer(null)
    setReportedIds(new Set())
    setView('QUIZ')
  }

  const reportQuestion = () => {
    const q = session[qIndex]
    const report = {
      id: q.id,
      question: q.question,
      hasImage: !!q.image,
      topic: q.subLabel,
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
    const q = session[qIndex]
    const correct = q.correct
    const isCorrect = answer === correct
    setUserAnswers(prev => [...prev, answer])
    setLastAnswer({ answer, correct, isCorrect })

    // Update live stats immediately (persists even if quiz is exited)
    setQuestionStats(prev => {
      const next = { ...prev }
      if (!next[q.id]) next[q.id] = { correct: 0, wrong: 0 }
      next[q.id] = {
        correct: next[q.id].correct + (isCorrect ? 1 : 0),
        wrong:   next[q.id].wrong   + (isCorrect ? 0 : 1),
      }
      localStorage.setItem('muoiQuestionStats', JSON.stringify(next))
      return next
    })

    setView('FEEDBACK')
  }

  const nextQuestion = () => {
    if (qIndex + 1 < session.length) {
      setQIndex(i => i + 1)
      setLastAnswer(null)
      setView('QUIZ')
    } else {
      setView('RESULTS')
    }
  }

  // Save history when RESULTS view is entered
  useEffect(() => {
    if (view !== 'RESULTS' || !session.length) return
    let score = 0
    userAnswers.forEach((a, i) => { if (session[i] && a === session[i].correct) score++ })
    const attempt = {
      date: new Date().toLocaleDateString('vi-VN'),
      topic: 'Tổng hợp',
      score,
      total: session.length,
      perfect: score === session.length,
    }
    setHistory(prev => {
      const newHistory = [attempt, ...prev].slice(0, 20)
      localStorage.setItem('muoiHistory', JSON.stringify(newHistory))
      return newHistory
    })
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  const exitQuiz = () => {
    setView('DASHBOARD')
    setSession([])
    setUserAnswers([])
    setQIndex(0)
    setLastAnswer(null)
  }

  // Compute per-subtopic stats for dashboard
  const computeTopicStats = () => {
    if (!allData) return []
    const result = []
    for (const [, parent] of Object.entries(allData)) {
      for (const [, sub] of Object.entries(parent.subtopics)) {
        let correct = 0, wrong = 0
        for (const q of sub.questions) {
          const s = questionStats[q.id]
          if (s) { correct += s.correct; wrong += s.wrong }
        }
        result.push({
          label: sub.label,
          emoji: sub.emoji,
          parentLabel: parent.label,
          correct,
          wrong,
          total: correct + wrong,
        })
      }
    }
    return result
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
    const topicStats = computeTopicStats()
    const hasStats   = topicStats.some(t => t.total > 0)
    return (
      <div className="app-container">
        <div className="card">
          <h1 className="title">🌟 Muối Bảo Duy Ôn Tập 🌟</h1>
          <p className="subtitle">Mỗi quiz gồm 10 câu từ tất cả các chủ đề!</p>

          <button className="btn-bubbly" onClick={startQuiz}>
            🎯 Bắt đầu Quiz!
          </button>

          {/* Topic stats */}
          {hasStats && (
            <div className="stats-shelf">
              <h3>📊 Thành tích theo chủ đề</h3>
              <div className="stats-table">
                <div className="stats-header">
                  <span>Chủ đề</span>
                  <span>Đúng</span>
                  <span>Sai</span>
                  <span>Tỷ lệ</span>
                </div>
                {topicStats.map((t, i) => {
                  const rate = t.total > 0 ? Math.round((t.correct / t.total) * 100) : null
                  return (
                    <div key={i} className="stats-row">
                      <span className="stats-label">{t.emoji} {t.label}</span>
                      <span className="stats-correct">{t.correct}</span>
                      <span className="stats-wrong">{t.wrong}</span>
                      <span className={`stats-rate ${rate !== null ? (rate >= 80 ? 'good' : rate >= 50 ? 'ok' : 'bad') : ''}`}>
                        {rate !== null ? `${rate}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Trophy shelf */}
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

  // ── QUIZ ──────────────────────────────────────────────────────────────────────
  if (view === 'QUIZ') {
    const q        = session[qIndex]
    const progress = (qIndex / session.length) * 100

    return (
      <div className="app-container">
        <div className="card">
          <div className="quiz-header">
            <button className="btn-exit" onClick={exitQuiz}>✕ Thoát</button>
            <span className="quiz-topic-tag">{q.subEmoji} {q.subLabel}</span>
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
              {reportedIds.has(q.id) ? '✓ Đã ghi nhận báo lỗi' : '⚠️ Không xem được hình / Sai đáp án'}
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

          <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
            <button
              className={`btn-report${reportedIds.has(q.id) ? ' reported' : ''}`}
              onClick={reportQuestion}
              disabled={reportedIds.has(q.id)}
            >
              {reportedIds.has(q.id) ? '✓ Đã ghi nhận báo lỗi' : '⚠️ Báo đáp án sai'}
            </button>
          </div>

          <button className="btn-bubbly" style={{ marginTop: '16px' }} onClick={nextQuestion}>
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
        mistakes.push({
          q: session[i].question,
          image: session[i].image || null,
          topic: `${session[i].subEmoji} ${session[i].subLabel}`,
          you: ans,
          correct: session[i].correct,
        })
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
                  <div className="review-topic-tag">{m.topic}</div>
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
              className="btn-bubbly btn-primary"
              style={{ flex: 1 }}
              onClick={startQuiz}
            >
              🔄 Làm lại
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
