# AIMoodDiary — Project Report

*Draft: technical and product details are filled from the codebase. Replace bracketed items, add screenshots, and paste evaluation numbers where indicated.*

---

## Executive summary

**AIMoodDiary** is a student wellness web application that lets users log mood in a low-friction way, see **positive / neutral / negative** classification with confidence, view **history** and **data-driven insights**, and use supportive **reflection** content and **mini-games** for breaks.

The core NLP component is a **fine-tuned RoBERTa model for 3-way emotion classification**, trained in a separate **legacy research** track on the **GoEmotions** dataset (with label reduction to three classes). That model is served by a **FastAPI** backend and integrated into diary generation, quick checks, and analytics.

The production front end is built with **Next.js** (React) and styled for a dark, accessible UI; the app has been deployed publicly (e.g. Vercel). **[INSERT: public app URL if allowed to share.]**

**[INSERT: one-line “headline” metric, e.g. best test accuracy / macro-F1 for the shipped 3-class model, from your training runs or `legacy/results/`.]**

---

## 1. Project overview

### 1.1 What the project is

- **Product:** A full-stack **AIMoodDiary** application: registration/login, mood capture (manual text, optional voice-to-text, AI-assisted diary text), persistence, visualizations, reflection hub, and unwind games with server-side stats.
- **Research / legacy track:** An **NLP experimentation** codebase under `legacy/`: GoEmotions data pipeline, **baseline (Logistic Regression + TF-IDF)**, **DistilBERT**, **RoBERTa (7-class and 3-class)**, notebooks, evaluation artifacts, and a **Streamlit** demo (`legacy/src/deployment/emotion_app.py`).

### 1.2 Problem it addresses

Students often need a **simple, private way** to notice patterns in how they feel without a heavy journaling burden. AIMoodDiary combines **quick logging**, **optional richer diary text** (with guardrails in the LLM prompt), and **aggregated insights** so users can reflect on trends over time.

### 1.3 What was delivered

| Area | Deliverable |
|------|-------------|
| Web UI | Next.js app with routes: Home, Quick Check, Diary, History, Insights, Reflect, Unwind; navigation and dashboard hub. |
| API | FastAPI service: `AIMoodDiary Backend` v0.1.0 — auth, mood entries, optional direct predict, insights pattern engine, speech transcription, minigame stats. |
| Model | RoBERTa **3-class** (`negative`, `neutral`, `positive`); local directory `models/roberta_emotion_model_3class` or Hub via `EMOTION_MODEL_HUB_ID`. |
| Data store | **PostgreSQL** via SQLAlchemy; users, mood entries (with optional probability columns), minigame statistics. |
| Generative / speech | **OpenAI** chat completions for diary text (`openai_model`, default `gpt-4o-mini`); **Whisper** for transcription (`whisper-1`), max **25 MB** audio per request. |
| Legacy | Notebooks, Streamlit app, alternative models and comparison workflow (see Section 4). |
| Lighter deploy bundle | `hf-deploy/` — FastAPI subset (health, predict, mood-entries, auth, insights) for Hugging Face or minimal hosting **without** speech and minigames routers. |

**[YOUR SCREENSHOT: product hero or logo + one dashboard view, labeled “Figure: AIMoodDiary product overview.”]**

---

## 2. Objectives and mapping to the system

Use this table in your final PDF; fill the “Evidence” column with figure numbers after you add screenshots.

| Objective | How the system supports it | Evidence in this report |
|-----------|----------------------------|-------------------------|
| Classify user text into **3 mood labels** with confidence | `EmotionClassifier` (Transformers) + `POST /api/v1/mood-entries` and `POST /api/v1/predict` | §5–6, Quick Check + API |
| **Persist** entries per user | SQLAlchemy `MoodEntry` with label, confidence, optional `prob_positive/neutral/negative` | History §6.3 |
| **Diary** flow: keywords → short entry → blend classifier signals | LLM `generate_diary` + **72%** keyword / **28%** generated text probability blend + lexical calibration | §4.2, §6.2 |
| **Insights** over time | `PatternEngine`: trend, weekly rhythm, volatility, transitions, keywords, streaks | §6.4 |
| **Student-friendly UX** | Reflect (quotes/spaces), Unwind (games), quick mood on Diary | §6.5–6.6 |
| Reproducible **NLP baselines and comparisons** | `legacy/` notebooks and `Streamlit` demo | §4.1, §7 |

**[INSERT: any formal client, course, or rubric requirements in your own words.]**

---

## 3. Scope, assumptions, and limitations

### 3.1 In scope (as implemented)

- Email + username **registration**; **login** by username; client stores `aimooddiary_username` in `localStorage` for session-like behavior.
- Text length limits: e.g. mood text up to **10,000** characters; diary keywords up to **2,000**; generated diary stored up to **20,000** (model fields in API).
- Up to **50** history entries by default in list API (`limit=50`, max **2000**); insights fetch up to **60** entries by default (max **500** in API).
- **Diary** quick moods use fixed keyword phrases: e.g. `"positive mood, feeling good"`, `"neutral mood, okay"`, `"negative mood, feeling low"`.
- Up to **10** keyword fields on the Diary page (`MAX_KEYWORD_BOXES`).

### 3.2 Out of scope / caveats

- The app is **not** a medical or crisis service. The insights engine includes a **blocklist of crisis-related tokens** so correlations are not surfaced as “positive”; this is a **safety nudge in analytics**, not a professional risk assessment. **[INSERT: your institutional disclaimer if required.]**
- Model is trained on **GoEmotions**; **domain shift** applies to real student diaries. **[INSERT: qualitative note if you ran manual checks.]**

### 3.3 Third-party services

- **OpenAI** (optional): required for **diary generation** and **Whisper** transcription. If `OPENAI_API_KEY` is missing, diary and speech return configuration errors (speech returns **503** with a clear message).
- **Deployment:** Front end uses `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8001` in code for local dev). **[INSERT: production API base URL you configured on Vercel.]**

**[INSERT: data retention / privacy policy statement appropriate for your submission.]**

---

## 4. Methodology and stack

### 4.1 Legacy research pipeline (GoEmotions and models)

The `legacy/README.md` describes:

- **Dataset:** **GoEmotions** (HuggingFace), **54,263** text samples; original labels are reduced to **7** categories, and further to **3** for the simplified product model (`positive` / `neutral` / `negative`).
- **Models compared conceptually:**  
  - **Baseline:** Logistic Regression + **TF-IDF**  
  - **DistilBERT** (fine-tuned)  
  - **RoBERTa** — **7-class** and **3-class** variants  
- **Artifacts:** Under `legacy/models/`: e.g. `distilbert_emotion_model/`, `roberta_emotion_model/`, `roberta_emotion_model_3class/`.  
- **Notebooks (ordered workflow):** `00_download_dataset` → `01_data_exploration` → `02_data_preprocessing` → `03_baseline_models` → `04_distilbert_training` → `05_roberta_training` (plus work for 3-class).  
- **Streamlit app:** `streamlit run` on `legacy/src/deployment/emotion_app.py` — **Plotly** figures, **cached** `load_roberta_3class_predictor`, page title “AIMoodDiary”.

**[YOUR SCREENSHOT: Streamlit app — main page with text input and prediction.]**  
**[YOUR SCREENSHOT: optional second — confusion matrix or Plotly figure from Streamlit if shown.]**  
**[INSERT: table or figure from `legacy/results/models/model_comparison.csv` and confusion matrices under `legacy/results/figures/` if present in your clone.]**  
*Note: If `legacy/results/` is empty in the repo, run `python legacy/src/model_evaluation.py` (per README) or export figures from notebooks and insert here.*

### 4.2 Production model and label mapping

- **Classes** (id order used by the mapping file): `0 → negative`, `1 → neutral`, `2 → positive` (`backend/app/assets/emotion_mapping_3class.json`).
- **Inference:** `EmotionClassifier` uses **HuggingFace** `AutoTokenizer` and `AutoModelForSequenceClassification`, **max_length 128**, softmax over logits, **CPU or CUDA** as available.
- **Configuration:** `emotion_model_dir` default `models/roberta_emotion_model_3class`, or `emotion_model_hub_id` for **Hub** loading. Default LLM: **`gpt-4o-mini`**; Whisper: **`whisper-1`**.

**Diary sentiment (important design detail):** For `POST /api/v1/mood-entries/diary`, the system:

1. Calls the LLM to generate **first-person** diary text from user **keywords** only (strict prompt: no invented events).
2. Runs the classifier on **keywords** and on **generated diary** separately.
3. **Blends** probabilities: **72%** keywords, **28%** diary.
4. Applies **lexical calibration** (`diary_sentiment_calibration.py`) to reduce **false positives** when the model’s silver-lining phrasing would pull toward “positive” despite stress-related words (e.g. *anxious*, *exhausted*, *overwhelmed* — pattern-based, no retraining).

### 4.3 API surface (AIMoodDiary Backend)

| Method | Path | Role |
|--------|------|------|
| POST | `/auth/register` | Register with **email** + **username** (3–50 chars) |
| POST | `/auth/login` | Login with **username** |
| POST | `/api/v1/mood-entries` | Create entry from **raw text**; `source` e.g. `manual`; runs classifier; saves **prob_* ** |
| GET | `/api/v1/mood-entries?username=…&limit=…` | List entries, newest first |
| POST | `/api/v1/mood-entries/diary` | Keywords + optional **tone** → LLM diary → blended label + `probabilities` |
| POST | `/api/v1/predict` | Direct **single** text prediction (no DB write) |
| POST | `/api/v1/predict_batch` | Batch predict (up to **128** texts) |
| GET | `/api/v1/insights?username=…&limit=…` | **PatternEngine** JSON (trends, etc.) |
| POST | `/api/v1/speech/transcribe` | Multipart audio → Whisper → `{ text }` |
| GET/POST | `/api/v1/minigames/…` | Stats and recording for `tic_tac_toe`, `reaction_tap`, `odd_one_out`, `coin_flip` |
| (health) | per `health` router | Liveness for deployment |

CORS: configured via `cors_origins` (e.g. `http://localhost:3000` in dev; add production origins in deployment).

**[INSERT: if you use `hf-deploy` only on Hugging Face, list the exact public Space URL and note that speech/minigames are not in that bundle.]**

### 4.4 Front-end stack (from `frontend/package.json`)

- **Next.js 16.1.6**, **React 19.2.3**, **TypeScript 5**  
- **Tailwind CSS 4**, **Recharts 3.7** (charts on Insights)  
- **lucide-react** icons, **next-themes**, **Radix** slot

### 4.5 Back-end stack (from `backend/requirements.txt`)

- **FastAPI**, **Uvicorn**, **Pydantic** / **pydantic-settings**  
- **SQLAlchemy**, **Alembic**, **psycopg** (PostgreSQL)  
- **PyTorch**, **Transformers**, **safetensors**, **huggingface-hub**  
- **OpenAI** Python SDK, **NumPy**

---

## 5. System design

### 5.1 High-level architecture

```text
[Browser: Next.js on Vercel or local]
        |
        | HTTPS (NEXT_PUBLIC_API_BASE_URL)
        v
[FastAPI: AIMoodDiary Backend]
   |-- Auth (Postgres: users)
   |-- Mood entries + EmotionClassifier (local or Hub)
   |-- Insights (PatternEngine, in-process)
   |-- OpenAI: chat + Whisper (optional)
   |-- Minigame stats (Postgres)
        |
        v
[PostgreSQL]
```

- **`hf-deploy` variant:** same core diagram but **omit** OpenAI speech router and minigames unless you add them later.

**[YOUR DIAGRAM: optional polished figure — use the text diagram above or draw in Mermaid/Draw.io, “Figure: System architecture.”]**

### 5.2 Insights engine (logic summary)

`PatternEngine` thresholds:

- **MIN_ENTRIES_BASIC = 3** — minimum entries for trend and keyword correlations  
- **MIN_ENTRIES_WEEKLY = 7** — for weekday rhythm  
- **MIN_ENTRIES_TRANSITIONS = 5** — for transition matrix and next-day blend  

**Outputs** (JSON): `trend` (linear fit on positivity score = `P(pos) − P(neg)` when probs exist), `weekly_rhythm`, `volatility`, `transitions` (Markov + **30%** recent-3-day blend), `keyword_correlations` (up to **20** keywords, crisis tokens forced negative association), `streaks` (logging streak, positive streaks), and human-readable **`insights` strings`.

---

## 6. Implementation and features (by screen)

For each subsection, keep **one** screenshot in the final report unless you need before/after.

### 6.1 Home, authentication, and dashboard

- **Home (`/`):** Signup requires **valid email** (regex: `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` style) and **username**; posts to `POST {API}/auth/register`. **Login** uses **username** only, `POST {API}/auth/login`. On success, `aimooddiary_username` is stored and user is sent to `/dashboard`.  
- **Dashboard (`/dashboard`):** Card grid describing Quick Check, Diary, History, Insights, Reflect, Unwind (short copy matches each feature).

**[YOUR SCREENSHOT: signup or login page.]**  
**[YOUR SCREENSHOT: dashboard with cards.]**

### 6.2 Quick Check (`/quick-check`)

- User pastes text; on submit, **`POST /api/v1/mood-entries`** with `source: "manual"`; backend classifies and persists; UI shows **label**, **confidence**, optional **probabilities**.

**[YOUR SCREENSHOT: filled form with prediction result.]**

### 6.3 Diary (`/diary`)

- **Quick mood** buttons: three emojis call `submitDiary` with the fixed keyword strings (see §3.1).  
- **Keywords:** Up to 10 boxes; combined with `", "`. Optional **tone** (e.g. casual).  
- **Voice:** `DiaryVoiceButton` records audio; client sends to **`/api/v1/speech/transcribe`**; returned text fills keyword field (user can edit). Uses **Whisper** server-side.  
- **Save:** `POST /api/v1/mood-entries/diary` with `username`, `keywords`, `tone`. Response includes `diary_text`, `label`, `confidence`, `probabilities` (blended).

**[YOUR SCREENSHOT: Diary input (you may already have this).]**  
**[YOUR SCREENSHOT: result panel with label, confidence, and optional generated diary text.]**

### 6.4 History (`/history`)

- Fetches `GET /api/v1/mood-entries?username=…&limit=50`; displays **timestamp, source, raw text, diary text, label, confidence**.

**[YOUR SCREENSHOT: history list with multiple rows.]**

### 6.5 Insights (`/insights`)

- Fetches `GET /api/v1/insights?username=…` and renders **Recharts** (line, bar, etc.) plus calendar advice helpers (`moodCalendarAdvice`). Shows pattern messages (trend, weekly best/worst, volatility, transitions, keyword correlation).

**[YOUR SCREENSHOT: trend or line chart.]**  
**[YOUR SCREENSHOT: calendar or secondary chart / insight text.]**

### 6.6 Reflect (`/reflect` and `/reflect/[slug]`)

- Hub lists mood “spaces”; dynamic routes load content (quotes, **Spotify** / **YouTube** links from data modules such as `moodReflections` / `ReflectRelaxLinks`).

**[YOUR SCREENSHOT: Reflect hub.]**  
**[YOUR SCREENSHOT: one mood subpage.]**

### 6.7 Unwind (`/unwind`)

- Client games: **`tic_tac_toe`**, **`reaction_tap`**, **`odd_one_out`**, **`coin_flip`**. Scores and streaks can be **persisted** via minigame API (plays, wins, best reaction time ms, best streak).

**[YOUR SCREENSHOT: one minigame in play.]**  
**[YOUR SCREENSHOT: optional — stats if shown in UI.]**

### 6.8 Code reference (optional for technical readers)

**Classifier prediction (concept):** tokenize → model logits → softmax → `EmotionPrediction` with `label`, `confidence`, per-class `probabilities`.

**Example diary blend (simplified):** 0.72 × P(keywords) + 0.28 × P(diary), then **calibration** from keyword+diary text.

---

## 7. Results and evaluation

### 7.1 Legacy / offline metrics

- Use **`legacy/results/`** (model comparison CSV, confusion matrix PNGs) when available.  
- Summarize: **Logistic Regression vs DistilBERT vs RoBERTa (7) vs RoBERTa (3)**.  
- **Macro-F1** or **accuracy** — **[INSERT: your best numbers per model.]**

**[YOUR FIGURE: confusion matrix for RoBERTa 3-class (or the model you ship).]**  
**[YOUR TABLE: model comparison from CSV or notebook output.]**

### 7.2 Product-level “results”

- **Qualitative:** Diary + Insights screenshots showing **end-to-end** value.  
- **Optional:** API latency p50/p95 **[INSERT: if you measured with curl or browser Network tab.]**  
- **Optional:** Number of test users or demo sessions **[INSERT if applicable.]**

### 7.3 Objective traceability

| Stated goal | Result |
|-------------|--------|
| 3-class mood classification | Shipped `EmotionClassifier` + mapping JSON; used on Quick Check, Diary, stored in DB |
| Insights | `PatternEngine` with documented thresholds and outputs |
| Low-friction capture | Quick mood, Whisper, short LLM diaries with strict prompt |

---

## 8. Challenges and solutions (suggested bullets — keep only what you actually experienced)

| Challenge | How the codebase addresses it |
|-----------|------------------------------|
| LLM “silver linings” skewing emotion positive | **Probability blend** (72/28) + **lexical calibration** on diary/keywords |
| Student text ≠ GoEmotions | Acknowledge in limitations; 3-class UI matches simple emoji feedback |
| Crisis-related words in keyword analytics | `CRISIS_SENSITIVE_KEYWORDS` down-ranks spurious “positive” associations |
| Optional OpenAI in prod | Clear HTTP errors if API key missing; speech returns 503 with message |
| CORS for separate front and API | `cors_origins` list in settings |
| Smaller cloud deploy | **`hf-deploy`** omits heavy optional routers |

**[INSERT: 1–2 personal challenges — e.g. environment setup, Vercel env vars, database migration — and how you fixed them.]**

---

## 9. Deliverables and handover

| Item | Path / instruction |
|------|-------------------|
| Front end | `frontend/` — `npm install`, `npm run dev` (port 3000 default); set **`NEXT_PUBLIC_API_BASE_URL`**. |
| Full backend | `backend/` — Python venv, `pip install -r requirements.txt`, set **`.env`**: `DATABASE_URL`, `EMOTION_MODEL_HUB_ID` *or* place **`models/roberta_emotion_model_3class`**, `OPENAI_API_KEY` for diary/speech, `CORS_ORIGINS`. Run Uvicorn (default app port **8000** in config; front-end sample uses **8001** in dev—align ports). |
| Hub deploy | `hf-deploy/` — slimmer `main.py` (no speech, no minigames). |
| Legacy NLP | `legacy/` — notebooks, Streamlit, `src/model_inference.py`, evaluation scripts. |
| Migrations | `alembic/` under backend **[INSERT: command you use, e.g. `alembic upgrade head`].** |

**[INSERT: Git remote URL, Hugging Face Space name, and Vercel project name if handing to a client.]**  
**[INSERT: .env example with secrets redacted.]**

---

## 10. Conclusion and next steps

**Achieved:** A working **student wellness** product with a **documented API**, **3-class RoBERTa** integration, **LLM-assisted diary** with **blended sentiment**, **Whisper** dictation, **pattern insights**, and a **legacy** research trail (baselines, transformers, Streamlit).

**Next steps (examples — trim to your audience):**

- Finetune or **distill** a smaller on-device model for **privacy/scale**.  
- Active learning: collect (with consent) in-domain student snippets to **reduce domain gap**.  
- **Multilingual** support if the cohort needs it.  
- Deeper **crisis** integration only with **professional** partners and legal review.  
- Expand `hf-deploy` to parity with full backend if one deployment target is required.

**[INSERT: 2–3 sentences of personal closing or course reflection.]**

---

## Appendix: Screenshot checklist (for your final PDF)

- [ ] Streamlit (legacy) — main prediction  
- [ ] Model comparison and/or confusion matrix (legacy)  
- [ ] Home / auth  
- [ ] Dashboard  
- [ ] Quick Check with result  
- [ ] Diary (input + result)  
- [ ] History  
- [ ] Insights (≥2 views)  
- [ ] Reflect hub + one slug page  
- [ ] Unwind game  
- [ ] (Optional) Network tab or OpenAPI doc for API  

---

*End of report draft.*
