# English Quiz — Implementation Plan

## Overview

Add a separate English quiz mode to the existing Muoi exam app. English questions live in a new data file and are launched from a dedicated button on the dashboard. Three new question types are introduced: standard MCQ, listening (Web Speech API), and spelling (text input).

---

## Changes from Original Plan

Three additions:
1. **Speaking/Listening** — audio via browser Web Speech API, no MP3 files needed
2. **Spelling input** — kid types the full word, not picks from options
3. **Images** — cropped from worksheet JPGs + internet search for missing vocabulary

---

## Question Types

### Type A — `"mcq"` (existing, unchanged)

```json
{
  "id": "en_cv1",
  "type": "mcq",
  "question": "Which word is a body part?",
  "options": ["jacket", "arm", "park", "bee"],
  "correct": "arm"
}
```

### Type B — `"listening"` (new)

```json
{
  "id": "en_sp1",
  "type": "listening",
  "speak": "Have you got a dog?",
  "question": "🔊 Listen and choose the correct answer:",
  "options": ["Yes, I have.", "Yes, I am.", "Yes, I do.", "Yes, I can."],
  "correct": "Yes, I have."
}
```

> No MP3 files. Uses `window.speechSynthesis` (Web Speech API) — works offline, cross-device. Clicking the play button reads `speak` text at `rate: 0.75`, `lang: 'en-US'`.

### Type C — `"spelling"` (new)

```json
{
  "id": "en_sw1",
  "type": "spelling",
  "question": "Look at the picture and write the word:",
  "image": "/images/en_elephant.jpg",
  "hint": "e _ _ p h _ n t",
  "correct": "elephant"
}
```

> Kid types the full word. Check is case-insensitive and whitespace-trimmed. `hint` is optional — omit for harder questions.

---

## Subtopics — `data/english_questions.json`

9 subtopics, ~145 questions total.

| Key | Label | Emoji | Type mix | Source | Questions |
|---|---|---|---|---|---|
| `camb_vocab` | Vocabulary | 📝 | mcq | cambridge_english.md | ~15 |
| `camb_grammar` | Grammar | ✏️ | mcq, listening | grammar_and_structure.md | ~20 |
| `phonics` | Phonics | 🔤 | mcq | english_phonics.md, phonics_1.JPG | ~15 |
| `vocab_themes` | Vocabulary Themes | 🏷️ | mcq | english_vocabulary.md | ~15 |
| `eng_math` | English Math | 🔢 | mcq | english_math.md | ~15 |
| `science` | Science | 🔬 | mcq | english_science.md | ~15 |
| `reading` | Reading | 📖 | mcq | reading_and_writing.md | ~10 |
| `speaking` | Listening & Speaking | 🔊 | listening | english_speaking.md, grammar_and_structure.md | ~20 |
| `spelling` | Spelling Practice | ✍️ | spelling (70%), mcq (30%) | vocabulary_1.JPG, vocabulary_2.JPG, all word lists | ~20 |

### Top-level JSON structure

```json
{
  "english": {
    "label": "English",
    "emoji": "🇬🇧",
    "color": "english",
    "subtopics": {
      "camb_vocab":   { "label": "Vocabulary",          "emoji": "📝", "questions": [] },
      "camb_grammar": { "label": "Grammar",              "emoji": "✏️", "questions": [] },
      "phonics":      { "label": "Phonics",              "emoji": "🔤", "questions": [] },
      "vocab_themes": { "label": "Vocabulary Themes",    "emoji": "🏷️", "questions": [] },
      "eng_math":     { "label": "English Math",         "emoji": "🔢", "questions": [] },
      "science":      { "label": "Science",              "emoji": "🔬", "questions": [] },
      "reading":      { "label": "Reading",              "emoji": "📖", "questions": [] },
      "speaking":     { "label": "Listening & Speaking", "emoji": "🔊", "questions": [] },
      "spelling":     { "label": "Spelling Practice",    "emoji": "✍️", "questions": [] }
    }
  }
}
```

### Speaking question coverage

- **Hear a word → identify it:** "You hear a word. What do you hear?" — 4 similar-sounding options
- **Hear a question → correct response:** "Have you got…?" / "Would you like…?" / "Where is…?" / "How many…?"
- **Hear a sentence → True or False:** "You hear: 'The cat is on the table.' Is this true?" — shown with image

### Spelling question coverage

Sourced from `vocabulary_1.JPG` and `vocabulary_2.JPG` (clean picture-per-word grids):

- **Picture → type word:** `jacket`, `skirt`, `ceiling`, `sink`, `elephant`, `crocodile`, `firefighter`, `goat`, `teacher`, `peaches`, `boat`, `school` …
- **Phonics pattern → type a word:** "Write a word with the **oa** sound" → `boat`
- **Choose-correct-spelling MCQ (30%):** `elephant` vs `elephent` vs `elefant` vs `elephan`
- **Partial sentence → type missing word:** "He's wearing a ______." (shown with picture of jacket)

---

## Image Strategy

### Tier 1 — Crop from source worksheets (primary, no new assets needed)

`vocabulary_1.JPG` and `vocabulary_2.JPG` contain clean picture-per-word grids. A new script extracts individual cells:

```
scripts/crop_english_images.py
  Input:  english-exam-materials/vocabulary_1.JPG   (~40 cells: clothing, senses, house, food)
          english-exam-materials/vocabulary_2.JPG   (~25 cells: tch/ea/ay/oo/y/oa/er words)
  Output: public/images/en_jacket.jpg
          public/images/en_skirt.jpg
          public/images/en_floor.jpg
          public/images/en_fruit.jpg
          ... (65+ images)
```

Uses `PIL` (already available via `scripts/crop_images.py`). Coordinates need one calibration pass per image.

`phonics_practices_1.JPG` can also supply individual picture-per-sound crops for phonics MCQ questions.

### Tier 2 — Web search for missing vocabulary (~25 images)

Words not pictured in any source worksheet:

| Category | Words |
|---|---|
| Animals | monkey, giraffe, lion, tiger, parrot, crocodile |
| Action verbs | bounce, swim, catch, run, ride |
| Places | supermarket, library, coffee shop, zoo |
| Other | umbrella, kite, shopping cart, thermometer |

Search strategy: `"[word] clipart PNG transparent"` or `"[word] cartoon simple white background"`. Sources: Wikimedia Commons, Pixabay, Flaticon (all free). Save to `public/images/en_[word].jpg`.

### Tier 3 — Emoji fallback (zero effort)

For questions where the image is decorative context only, embed emoji directly in the question text:

```json
"question": "What animal is 🐘?"
```

---

## App.jsx Changes

### New state

```js
const [engData, setEngData]        = useState(null)   // english_questions.json
const [engStats, setEngStats]      = useState({})     // localStorage 'muoiEngStats'
const [quizMode, setQuizMode]      = useState('vi')   // 'vi' | 'en'
const [spellingInput, setSpelling] = useState('')     // typed answer
const [isSpeaking, setIsSpeaking]  = useState(false)  // TTS animation
```

### New functions

```js
// Load english_questions.json alongside questions.json in useEffect

startEnglishQuiz()
  // calls buildSession(engData), sets quizMode='en', view='QUIZ'

speakText(text)
  // const u = new SpeechSynthesisUtterance(text)
  // u.lang = 'en-US'; u.rate = 0.75
  // setIsSpeaking(true)
  // u.onend = () => setIsSpeaking(false)
  // window.speechSynthesis.speak(u)

handleSpelling()
  // compares spellingInput.trim().toLowerCase() to q.correct.toLowerCase()
  // then calls handleAnswer(spellingInput.trim()) with same existing flow
```

### QUIZ view — new conditional blocks

```jsx
{/* Listening: play button above options */}
{q.type === 'listening' && (
  <button className="btn-speak" onClick={() => speakText(q.speak)}>
    {isSpeaking ? '⏸ Playing…' : '🔊 Play'}
  </button>
)}

{/* Spelling: text input replaces option buttons */}
{q.type === 'spelling' ? (
  <div className="spelling-area">
    {q.hint && <p className="spelling-hint">{q.hint}</p>}
    <input
      className="spelling-input"
      value={spellingInput}
      onChange={e => setSpelling(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleSpelling()}
      placeholder="Type the word here…"
      autoFocus
    />
    <button className="btn-bubbly" onClick={handleSpelling}>Check ✓</button>
  </div>
) : (
  <div className="options-grid">
    {/* existing MCQ options */}
  </div>
)}
```

Reset `spellingInput` to `''` on each `nextQuestion()`.

### Dashboard — second button + second stats block

```jsx
<button className="btn-bubbly btn-english" onClick={startEnglishQuiz}>
  🇬🇧 English Quiz!
</button>

{/* English stats table — same component as Vietnamese, fed engStats */}
```

### Stats tracking

`quizMode` flag determines which localStorage key is written on each answer:
- `'vi'` → `muoiQuestionStats`
- `'en'` → `muoiEngStats`

Dashboard computes two `computeTopicStats()` calls — one per data source — and renders two separate stat tables.

---

## CSS Additions

```css
/* New color token */
:root {
  --english:        #7B61FF;
  --english-shadow: #5A3FCC;
}

/* English quiz button */
.btn-english {
  background: var(--english);
  box-shadow: 0 7px 0 var(--english-shadow);
}

/* Listening play button */
.btn-speak {
  display: block;
  margin: 0 auto 20px;
  background: var(--english);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 14px 32px;
  font-size: 1.3rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 5px 0 var(--english-shadow);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-speak:active { transform: translateY(5px); box-shadow: none; }

/* Spelling input */
.spelling-area { display: flex; flex-direction: column; gap: 14px; margin-top: 10px; }

.spelling-hint {
  text-align: center;
  letter-spacing: 0.3em;
  font-size: 1.5rem;
  font-weight: 900;
  color: #888;
}

.spelling-input {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  border: 3px solid #E0E0E0;
  border-radius: 14px;
  padding: 14px;
  width: 100%;
  outline: none;
  font-family: 'Nunito', sans-serif;
}
.spelling-input:focus { border-color: var(--english); }
```

---

## Execution Order

| # | Task | Notes |
|---|---|---|
| 1 | Write `scripts/crop_english_images.py` and run it | Calibrate pixel coordinates from vocabulary_1.JPG and vocabulary_2.JPG |
| 2 | Download ~25 missing vocabulary images from the web | Save to `public/images/en_[word].jpg` |
| 3 | Write `data/english_questions.json` — all 9 subtopics | Generate per-subtopic; images reference crops from Step 1–2 |
| 4 | Update `App.jsx` — load eng data, `startEnglishQuiz`, `quizMode`, TTS, spelling input | Reuses existing quiz/feedback/results screens |
| 5 | Update `App.css` — new color token + speaking + spelling styles | ~40 lines |
| 6 | Build and test both quiz paths | `npm run build` then manual test |

### Risk: image cropping coordinates

Exact pixel boundaries of each cell in `vocabulary_1.JPG` and `vocabulary_2.JPG` must be measured before the crop script can be written. This requires opening each image at known dimensions (e.g., in Preview) and recording the bounding box of each cell manually — one-time effort, ~30 minutes.
