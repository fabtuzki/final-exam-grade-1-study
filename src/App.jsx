import { useState, useEffect, useRef } from 'react'
import questionsData from '../data/questions.json'
import englishData  from '../data/english_questions.json'

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random())
}

function buildSession(allData) {
  const subtopics = []
  for (const [pk, parent] of Object.entries(allData)) {
    for (const [, sub] of Object.entries(parent.subtopics)) {
      const taggedQs = sub.questions.map(q => ({
        ...q,
        parentLabel: parent.label,
        subLabel:    sub.label,
        subEmoji:    sub.emoji,
      }))
      subtopics.push(taggedQs)
    }
  }
  let picked = subtopics.map(qs => shuffle(qs)[0])
  const pickedIds = new Set(picked.map(q => q.id))
  const remaining = subtopics.flat().filter(q => !pickedIds.has(q.id))
  const extra = shuffle(remaining).slice(0, Math.max(0, 10 - picked.length))
  picked = shuffle([...picked, ...extra])
  return picked.map(q => ({ ...q, options: q.options ? shuffle(q.options) : undefined }))
}

export default function App() {
  const [allData, setAllData]             = useState(null)
  const [engAllData, setEngAllData]       = useState(null)
  const [view, setView]                   = useState('DASHBOARD')
  const [quizMode, setQuizMode]           = useState('vi')   // 'vi' | 'en'
  const [session, setSession]             = useState([])
  const [qIndex, setQIndex]               = useState(0)
  const [userAnswers, setUserAnswers]     = useState([])
  const [lastAnswer, setLastAnswer]       = useState(null)
  const [history, setHistory]             = useState([])
  const [goldCups, setGoldCups]           = useState(0)
  const [smellShoes, setSmellShoes]       = useState(0)
  const [reports, setReports]             = useState([])
  const [reportedIds, setReportedIds]     = useState(new Set())
  const [questionStats, setQuestionStats] = useState({})
  const [engStats, setEngStats]           = useState({})
  const [spellingInput, setSpelling]      = useState('')
  const [isSpeaking, setIsSpeaking]       = useState(false)
  const spellingRef = useRef(null)

  useEffect(() => {
    setAllData(questionsData)
    setEngAllData(englishData)

    const saved = localStorage.getItem('muoiHistory')
    if (saved) setHistory(JSON.parse(saved))

    // Trophy counters are stored independently — they never decrease
    const cups  = parseInt(localStorage.getItem('muoiGoldCups')  ?? '0', 10)
    const shoes = parseInt(localStorage.getItem('muoiSmellShoes') ?? '0', 10)
    setGoldCups(cups)
    setSmellShoes(shoes)

    const savedReports = localStorage.getItem('muoiReports')
    if (savedReports) setReports(JSON.parse(savedReports))
    const savedStats = localStorage.getItem('muoiQuestionStats')
    if (savedStats) setQuestionStats(JSON.parse(savedStats))
    const savedEngStats = localStorage.getItem('muoiEngStats')
    if (savedEngStats) setEngStats(JSON.parse(savedEngStats))
  }, [])

  const speakText = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.8
    u.onstart = () => setIsSpeaking(true)
    u.onend   = () => setIsSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const startQuiz = (mode = 'vi') => {
    const data = mode === 'en' ? engAllData : allData
    const picked = buildSession(data)
    setSession(picked)
    setUserAnswers([])
    setQIndex(0)
    setLastAnswer(null)
    setReportedIds(new Set())
    setSpelling('')
    setQuizMode(mode)
    setView('QUIZ')
  }

  const reportQuestion = () => {
    const q = session[qIndex]
    const report = {
      id: q.id, question: q.question, hasImage: !!q.image,
      topic: q.subLabel, date: new Date().toLocaleDateString('vi-VN'),
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
    const correct   = q.correct
    const isCorrect = answer.trim().toLowerCase() === correct.trim().toLowerCase()
    const newAnswers = [...userAnswers, answer]
    setUserAnswers(newAnswers)
    setLastAnswer({ answer, correct, isCorrect })
    setSpelling('')

    const statsKey = quizMode === 'en' ? 'muoiEngStats' : 'muoiQuestionStats'
    const setter   = quizMode === 'en' ? setEngStats : setQuestionStats
    setter(prev => {
      const next = { ...prev }
      if (!next[q.id]) next[q.id] = { correct: 0, wrong: 0 }
      next[q.id] = {
        correct: next[q.id].correct + (isCorrect ? 1 : 0),
        wrong:   next[q.id].wrong   + (isCorrect ? 0 : 1),
      }
      localStorage.setItem(statsKey, JSON.stringify(next))
      return next
    })

    // Save history + update trophy counters when the last question is answered.
    // Done here (not in useEffect) to use synchronous local values, avoiding
    // stale closure bugs. Trophy counters are stored independently so they
    // never decrease when old history entries roll off the 20-entry cap.
    const isLast = qIndex + 1 >= session.length
    if (isLast) {
      let score = 0
      newAnswers.forEach((a, i) => {
        if (session[i] && a.trim().toLowerCase() === session[i].correct.trim().toLowerCase()) score++
      })
      const perfect = score === session.length
      const attempt = {
        date:  new Date().toLocaleDateString('vi-VN'),
        topic: quizMode === 'en' ? '🇬🇧 English' : 'Tổng hợp',
        score, total: session.length, perfect,
      }
      setHistory(prev => {
        const newHistory = [attempt, ...prev].slice(0, 20)
        localStorage.setItem('muoiHistory', JSON.stringify(newHistory))
        return newHistory
      })
      // Increment the independent trophy counters — they only ever go up
      if (perfect) {
        setGoldCups(prev => {
          const next = prev + 1
          localStorage.setItem('muoiGoldCups', String(next))
          return next
        })
      } else {
        setSmellShoes(prev => {
          const next = prev + 1
          localStorage.setItem('muoiSmellShoes', String(next))
          return next
        })
      }
    }

    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    setView('FEEDBACK')
  }

  const nextQuestion = () => {
    if (qIndex + 1 < session.length) {
      setQIndex(i => i + 1)
      setLastAnswer(null)
      setSpelling('')
      setView('QUIZ')
    } else {
      setView('RESULTS')
    }
  }

  // Auto-focus spelling input when question changes
  useEffect(() => {
    if (view === 'QUIZ' && session[qIndex]?.type === 'spelling') {
      setTimeout(() => spellingRef.current?.focus(), 100)
    }
  }, [view, qIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const exitQuiz = () => {
    window.speechSynthesis?.cancel()
    setView('DASHBOARD')
    setSession([])
    setUserAnswers([])
    setQIndex(0)
    setLastAnswer(null)
    setSpelling('')
  }

  const computeTopicStats = (data, stats) => {
    if (!data) return []
    const result = []
    for (const [, parent] of Object.entries(data)) {
      for (const [, sub] of Object.entries(parent.subtopics)) {
        let correct = 0, wrong = 0
        for (const q of sub.questions) {
          const s = stats[q.id]
          if (s) { correct += s.correct; wrong += s.wrong }
        }
        result.push({ label: sub.label, emoji: sub.emoji, correct, wrong, total: correct + wrong })
      }
    }
    return result
  }

  if (!allData || !engAllData) {
    return (
      <div className="app-container">
        <div className="card" style={{ textAlign: 'center', marginTop: '20vh' }}>
          <div style={{ fontSize: '4rem' }}>⏳</div>
          <h2>Đang tải dữ liệu...</h2>
        </div>
      </div>
    )
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────────
  if (view === 'DASHBOARD') {
    const viStats  = computeTopicStats(allData, questionStats)
    const enStats  = computeTopicStats(engAllData, engStats)
    const hasViStats = viStats.some(t => t.total > 0)
    const hasEnStats = enStats.some(t => t.total > 0)

    const StatsTable = ({ rows }) => (
      <div className="stats-table">
        <div className="stats-header">
          <span>Chủ đề</span><span>Đúng</span><span>Sai</span><span>Tỷ lệ</span>
        </div>
        {rows.map((t, i) => {
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
    )

    return (
      <div className="app-container">
        <div className="card">
          <h1 className="title">🌟 Muối Bảo Duy Ôn Tập 🌟</h1>

          <div className="quiz-start-buttons">
            <button className="btn-bubbly btn-primary" onClick={() => startQuiz('vi')}>
              📚 Tiếng Việt & Toán
            </button>
            <button className="btn-bubbly btn-english" onClick={() => startQuiz('en')}>
              🇬🇧 English Quiz!
            </button>
          </div>

          {/* Vietnamese/Math stats */}
          {hasViStats && (
            <div className="stats-shelf">
              <h3>📊 Thành tích Tiếng Việt & Toán</h3>
              <StatsTable rows={viStats} />
            </div>
          )}

          {/* English stats */}
          {hasEnStats && (
            <div className="stats-shelf stats-shelf-en">
              <h3>📊 English Progress</h3>
              <StatsTable rows={enStats} />
            </div>
          )}

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
    const isSpelling  = q.type === 'spelling'
    const isListening = q.type === 'listening'

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

          {q.image && <img src={q.image} alt="illustration" className="question-image" />}

          {/* Listening play button */}
          {isListening && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <button className="btn-speak" onClick={() => speakText(q.speak)}>
                {isSpeaking ? '⏸ Playing…' : '🔊 Play'}
              </button>
            </div>
          )}

          {/* Report button */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <button
              className={`btn-report${reportedIds.has(q.id) ? ' reported' : ''}`}
              onClick={reportQuestion}
              disabled={reportedIds.has(q.id)}
            >
              {reportedIds.has(q.id) ? '✓ Đã báo lỗi' : '⚠️ Báo lỗi câu hỏi'}
            </button>
          </div>

          {/* Spelling input */}
          {isSpelling ? (
            <div className="spelling-area">
              {q.hint && <p className="spelling-hint">{q.hint}</p>}
              <input
                ref={spellingRef}
                className="spelling-input"
                value={spellingInput}
                onChange={e => setSpelling(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && spellingInput.trim() && handleAnswer(spellingInput.trim())}
                placeholder="Type the word here…"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                className="btn-bubbly"
                onClick={() => spellingInput.trim() && handleAnswer(spellingInput.trim())}
                disabled={!spellingInput.trim()}
              >
                Check ✓
              </button>
            </div>
          ) : (
            <div className="options-grid">
              {q.options.map((opt, i) => (
                <button key={i} className="option-btn" onClick={() => handleAnswer(opt)}>
                  <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          )}
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
            <span>{isCorrect ? 'Correct!' : 'Not quite!'}</span>
          </div>

          {!isCorrect && (
            <div className="feedback-detail">
              <p className="feedback-question-text">{q.question}</p>
              {q.image && <img src={q.image} alt="illustration" className="feedback-question-image" />}
              <p>You answered: <span className="wrong-ans">{answer}</span></p>
              <p>Correct answer: <span className="correct-ans">{correct}</span></p>
            </div>
          )}

          <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
            <button
              className={`btn-report${reportedIds.has(q.id) ? ' reported' : ''}`}
              onClick={reportQuestion}
              disabled={reportedIds.has(q.id)}
            >
              {reportedIds.has(q.id) ? '✓ Đã báo lỗi' : '⚠️ Báo đáp án sai'}
            </button>
          </div>

          <button className="btn-bubbly" style={{ marginTop: '16px' }} onClick={nextQuestion}>
            {isLast ? '🏁 See Results' : 'Next Question →'}
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
      const correct = session[i]?.correct ?? ''
      if (ans.trim().toLowerCase() === correct.trim().toLowerCase()) {
        score++
      } else {
        mistakes.push({
          q:      session[i].question,
          image:  session[i].image || null,
          topic:  `${session[i].subEmoji} ${session[i].subLabel}`,
          you:    ans,
          correct,
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
                  {m.image && <img src={m.image} alt="illustration" className="review-image" />}
                  <div className="review-wrong">Muối chọn: {m.you}</div>
                  <div className="review-correct">Đáp án đúng: {m.correct}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
            <button className="btn-bubbly btn-primary" style={{ flex: 1 }} onClick={() => startQuiz(quizMode)}>
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
