# MoodMirror Project: Complete Project Note

**Document Purpose:** A comprehensive, detailed note covering (1) the existing MoodMirror emotion detection project as implemented in this repository, and (2) the extended MoodMirror idea for student daily mood tracking with keyword-based diary generation and NLP emotion analysis. Every relevant detail from the codebase and from our discussions is included for reference, literature review, and future implementation.

---

# PART I: EXISTING MOODMIRROR PROJECT (COMPLETED)

## 1. Project Overview

**Project Name:** MoodMirror – Emotion Detection Project

**Description:** A comprehensive NLP project for emotion classification from text using transformer-based models and traditional machine learning. The project implements and compares multiple models for emotion detection and provides a Streamlit web application for real-time predictions and trend visualization.

**Core Deliverables:**
- Multiple emotion classification models (baseline, DistilBERT, RoBERTa 7-class, RoBERTa 3-class).
- End-to-end pipeline from dataset download to model training and evaluation.
- Reusable inference API and a Streamlit deployment app with trend visualization across four text inputs.

---

## 2. Dataset

**Dataset Name:** GoEmotions (HuggingFace)

**Description:** The project uses the GoEmotions dataset from HuggingFace. It contains **54,263** text samples (English Reddit comments) labeled with emotions.

**Original Taxonomy:** 27 fine-grained emotion categories plus Neutral (e.g., admiration, anger, approval, caring, confusion, curiosity, desire, disappointment, disapproval, disgust, embarrassment, excitement, fear, gratitude, grief, joy, love, nervousness, optimism, pride, realization, relief, remorse, sadness, surprise, neutral).

**Project Mappings:**
- **7-class variant:** The 27 emotions are mapped to 7 simplified categories for the baseline, DistilBERT, and RoBERTa (7-class) models. Used in notebooks 00–05 and in `emotion_mapping.json`.
- **3-class variant:** The emotions are mapped to three categories—**positive**, **neutral**, **negative**—for the RoBERTa 3-class model used in the Streamlit app and in `emotion_mapping_3class.json`.

**Data Splits:** Train, validation, and test sets are created during preprocessing (in notebooks 02 and 08 for 3-class). The 3-class training notebook reports, for example, Train: (43362, 2), Val: (5421, 2), Test: (5421, 2) with balanced classes (e.g., 14454 per class for train).

---

## 3. Project Structure (File System)

```
.
├── data/
│   ├── raw/                    # Raw dataset files (e.g., from HuggingFace)
│   └── processed/             # Preprocessed CSVs and emotion mappings
│       ├── emotion_mapping.json
│       ├── emotion_mapping_3class.json
│       ├── train_processed.csv, val_processed.csv, test_processed.csv
│       └── train_processed_3class.csv, val_processed_3class.csv, test_processed_3class.csv
├── models/
│   ├── distilbert_emotion_model/
│   │   ├── config.json
│   │   ├── special_tokens_map.json
│   │   ├── tokenizer_config.json
│   │   └── vocab.txt
│   ├── roberta_emotion_model/
│   └── roberta_emotion_model_3class/
│       ├── config.json
│       ├── merges.txt
│       ├── model.safetensors
│       ├── special_tokens_map.json
│       ├── tokenizer_config.json
│       ├── training_args.bin
│       └── vocab.json
├── notebooks/
│   ├── 00_download_dataset.ipynb
│   ├── 01_data_exploration.ipynb
│   ├── 02_data_preprocessing.ipynb
│   ├── 03_baseline_models.ipynb
│   ├── 04_distilbert_training.ipynb
│   ├── 05_roberta_training.ipynb
│   ├── 06_roberta_3class_training.ipynb
│   ├── 07_data_exploration_3class.ipynb
│   ├── 08_data_preprocessing_3class.ipynb
│   └── 09_roberta_3class_training.ipynb
├── results/
│   ├── figures/               # Confusion matrices, comparison plots
│   └── models/                # CSV results
│       ├── baseline_model_results.csv
│       ├── distilbert_results.csv
│       ├── model_comparison.csv
│       ├── roberta_results.csv
│       └── roberta_results_3class.csv
├── src/
│   ├── model_inference.py
│   ├── model_evaluation.py
│   └── deployment/
│       └── emotion_app.py
├── requirements.txt
└── README.md
```

---

## 4. Pipeline (Notebooks Execution Order)

1. **00_download_dataset.ipynb** – Download GoEmotions from HuggingFace (`datasets` library). Map 27 emotions to 7 (or prepare for 3-class) and save raw/processed data as needed.
2. **01_data_exploration.ipynb** – Exploratory data analysis: class distribution, text length, sample inspection.
3. **02_data_preprocessing.ipynb** – Text cleaning, normalization, label encoding, train/val/test split for 7-class. Saves CSVs and `emotion_mapping.json`.
4. **03_baseline_models.ipynb** – Train Logistic Regression with TF-IDF (e.g., `TfidfVectorizer`), optional class balancing (e.g., SMOTE, under-sampling). Save model and vectorizer (e.g., joblib).
5. **04_distilbert_training.ipynb** – Fine-tune DistilBERT for 7-class emotion classification using HuggingFace `Trainer`, save to `models/distilbert_emotion_model/`.
6. **05_roberta_training.ipynb** – Fine-tune RoBERTa for 7-class emotion classification, save to `models/roberta_emotion_model/`.
7. **07_data_exploration_3class.ipynb** – EDA for 3-class (positive/neutral/negative) data.
8. **08_data_preprocessing_3class.ipynb** – Preprocessing and splits for 3-class; save `*_3class.csv` and `emotion_mapping_3class.json`.
9. **06_roberta_3class_training.ipynb** / **09_roberta_3class_training.ipynb** – Fine-tune RoBERTa for 3-class; save to `models/roberta_emotion_model_3class/`.

Model evaluation can be run via `python src/model_evaluation.py`, which loads all available models and test sets, computes metrics, and writes `results/models/model_comparison.csv` and figures under `results/figures/`.

---

## 5. Models Implemented

### 5.1 Baseline: Logistic Regression + TF-IDF

- **Input:** Text → TF-IDF vectorization (e.g., `TfidfVectorizer`, max_features=10000, ngram_range=(1,2), min_df=2).
- **Model:** `LogisticRegression` (max_iter=1000, random_state=42).
- **Class balancing:** SMOTE and RandomUnderSampler (from `imblearn`) on training data.
- **Output:** Emotion class (7 or 3). Stored as joblib files (model + vectorizer); emotion mapping from JSON.
- **Use in code:** `LogisticRegressionPredictor` in `model_inference.py` (loads model, vectorizer, emotion mapping; `predict` returns emotion and confidence from `predict_proba`).

### 5.2 DistilBERT

- **Base model:** HuggingFace `distilbert-base-uncased`.
- **Task:** Sequence classification with `DistilBertForSequenceClassification`, num_labels = 7 (for 7-class).
- **Tokenization:** `DistilBertTokenizer`, max_length=128, truncation and padding to max_length.
- **Output:** Emotion class and confidence (softmax over logits). Saved under `models/distilbert_emotion_model/`.
- **Use in code:** `DistilBERTPredictor` in `model_inference.py` (loads tokenizer and model, runs on CPU/CUDA, returns emotion and confidence).

### 5.3 RoBERTa (7-class)

- **Base model:** `roberta-base`.
- **Task:** `RobertaForSequenceClassification`, num_labels=7.
- **Tokenization:** `RobertaTokenizer`, max_length=128.
- **Training:** HuggingFace `Trainer` with appropriate `TrainingArguments` and data loaders.
- **Output:** Same as DistilBERT. Saved under `models/roberta_emotion_model/`.
- **Use in code:** `RoBERTaPredictor` in `model_inference.py`.

### 5.4 RoBERTa (3-class)

- **Same architecture as 7-class RoBERTa** but num_labels=3 (positive, neutral, negative).
- **Data:** Processed 3-class CSVs and `emotion_mapping_3class.json`.
- **Saved under:** `models/roberta_emotion_model_3class/` (includes config.json, model.safetensors, tokenizer files, training_args.bin, vocab.json, merges.txt).
- **Use in code:** `load_roberta_3class_predictor(base_path)` in `model_inference.py` returns a `RoBERTaPredictor` instance; this is the predictor used by the Streamlit app.

**Emotion mapping 3-class (from `data/processed/emotion_mapping_3class.json`):**
- emotion_to_id: negative → 0, neutral → 1, positive → 2.
- id_to_emotion: "0" → "negative", "1" → "neutral", "2" → "positive".

---

## 6. Model Performance (from results/models/model_comparison.csv)

| Model               | Accuracy | Precision | Recall | F1     |
|---------------------|----------|-----------|--------|--------|
| Logistic Regression | 0.5366   | 0.6179    | 0.5366 | 0.5556 |
| DistilBERT          | 0.6306   | 0.6742    | 0.6306 | 0.6406 |
| RoBERTa             | 0.5794   | 0.6829    | 0.5794 | 0.5968 |
| RoBERTa-3Class      | **0.7464** | **0.7441** | **0.7464** | **0.7439** |

The **RoBERTa 3-class** model is the best-performing and is used in the Streamlit app for real-time emotion prediction and trend visualization.

---

## 7. Source Code Details

### 7.1 model_inference.py

- **EmotionPredictor (base):** Holds `model_path`, `emotion_mapping_path`; loads `emotion_to_id`, `id_to_emotion`, `num_labels` from JSON. `predict(text)` is abstract.
- **RoBERTaPredictor:** Loads RoBERTa tokenizer and `RobertaForSequenceClassification` from `model_path`, uses `emotion_mapping` for num_labels and label names. Device: CUDA if available else CPU. `predict(text)`: tokenize (truncation, padding, max_length=128) → forward → softmax → argmax + confidence; returns (emotion, confidence).
- **DistilBERTPredictor:** Same pattern with DistilBert tokenizer and model.
- **LogisticRegressionPredictor:** Loads emotion mapping, model, and vectorizer from disk (joblib). `predict(text)`: vectorize → predict → predict_proba for confidence; returns (emotion, confidence).
- **load_roberta_3class_predictor(base_path="."):** Builds paths to `models/roberta_emotion_model_3class` and `data/processed/emotion_mapping_3class.json`, checks existence, returns `RoBERTaPredictor(model_path, emotion_mapping_path)`.

### 7.2 model_evaluation.py

- **EmotionDataset:** PyTorch Dataset wrapping (texts, labels, tokenizer, max_length=128); returns input_ids, attention_mask, labels.
- **evaluate_roberta_model(...):** Loads emotion mapping and test CSV, loads tokenizer (from model path or roberta-base), loads model from `model.safetensors` or `pytorch_model.bin` or best checkpoint by eval F1. Runs inference in batches (batch_size=32), computes accuracy, precision, recall, F1 (weighted), confusion matrix. Returns results dict, cm, emotion names, y_test, y_pred.
- **evaluate_distilbert_model(...):** Analogous for DistilBERT.
- **evaluate_baseline_model(...):** Reads baseline results CSV if present; optionally re-trains Logistic Regression on train data to produce confusion matrix (TF-IDF, SMOTE, RandomUnderSampler).
- **create_comparison_visualization(all_results, output_path):** Bar charts for accuracy, precision, recall, F1 per model; saves PNGs.
- **create_confusion_matrices(...):** Saves per-model confusion matrices (counts and normalized) and a combined figure.
- **main():** Loads test sets for 7-class and 3-class, runs evaluation for baseline, DistilBERT, RoBERTa 7-class, RoBERTa 3-class (with fallbacks to saved CSVs if model files missing), aggregates results, writes `model_comparison.csv` and all figures.

### 7.3 deployment/emotion_app.py

- **Stack:** Streamlit, Plotly.
- **Page config:** Title "MoodMirror", icon 😊, layout centered, sidebar collapsed.
- **Styles:** CSS for main-header, prediction-box, emotion-positive (green), emotion-negative (red), emotion-neutral (yellow).
- **@st.cache_resource load_model():** Calls `load_roberta_3class_predictor(base_path)` with base_path = project root; returns predictor or None.
- **get_emotion_color(emotion):** Returns CSS class for positive/negative/neutral.
- **get_emotion_value(emotion):** Maps negative→0, neutral→1, positive→2 for trend line.
- **Flow:**
  - One main text area (Text Input 1). Button "Predict Emotion" runs predictor.predict(text), appends to `st.session_state.predictions` with text, emotion, input_number=1, confidence; sets `show_additional_inputs=True`.
  - If `show_additional_inputs`, three more text areas (Inputs 2–4) and buttons "Predict All" and "Reset". "Predict All" runs predictor on all three, keeps prediction 1 and appends 2–4, sets input_count=4. "Reset" clears predictions and additional inputs.
  - Predictions 1–4 are shown in prediction boxes (emotion in color, text snippet).
  - When exactly 4 predictions exist: Plotly line chart "Emotion Trend Across 4 Inputs" (x = input number 1–4, y = emotion value 0/1/2), annotations per point; summary metrics: counts for Positive, Neutral, Negative.

---

## 8. Technology Stack (from requirements.txt)

- **Data & ML:** pandas, numpy, scikit-learn, nltk, transformers, torch, datasets, sentencepiece, tokenizers, safetensors, huggingface-hub.
- **Visualization:** matplotlib, seaborn, plotly.
- **API (optional):** fastapi, uvicorn, pydantic, pydantic-settings.
- **UI:** streamlit.
- **Jupyter:** jupyter, notebook, ipykernel, ipywidgets.
- **Utils:** tqdm, python-dotenv, joblib, python-multipart, scipy, imbalanced-learn, accelerate.

Python 3.8+; PyTorch 2.0+; Transformers 4.35+.

---

## 9. How to Run the Existing Project

- **Environment:** `python -m venv venv`, activate, `pip install -r requirements.txt`.
- **Notebooks:** Run 00 → 09 in order (or as needed for 7-class vs 3-class).
- **Evaluation:** `python src/model_evaluation.py` (from project root).
- **Streamlit app:** `streamlit run src/deployment/emotion_app.py` (from project root). App uses RoBERTa 3-class; first load may take several seconds. Open browser at http://localhost:8501.
- **Python API:** `from src.model_inference import load_roberta_3class_predictor; predictor = load_roberta_3class_predictor(); emotion, confidence = predictor.predict("I'm feeling great today!")`.

---

# PART II: EXTENDED MOODMIRROR IDEA (STUDENT MOOD TRACKER)

## 10. Core Idea and Motivation

**Target users:** Students.

**Goal:** Help students track daily mood and emotional status over time (e.g., day-by-day, week-by-week), with minimal friction (keyword- or short-text input), automated diary generation using an LLM, and emotion analysis using the existing NLP model. Students can review past days via a calendar and receive simple insights and patterns.

**Differentiator:** Combination of (1) flexible daily input (words/phrases/sentences), (2) automatic generation of a coherent diary entry from those inputs (LLM), (3) emotion classification of the generated diary (existing RoBERTa 3-class), (4) calendar visualization and weekly review with insights.

---

## 11. High-Level Pipeline

```
User Input (daily) → Dynamic Text Boxes (max 10/day) → Storage (JSON/SQLite)
       → At 12:00 AM: LLM Diary Generation → RoBERTa Emotion Analysis
       → Save: date, entries, generated_diary, emotion, confidence
       → Calendar View (color-coded) + Day Detail (diary + emotion) + Insights Dashboard
```

---

## 12. Four Phases (Detailed)

### Phase 1: Daily Entry Collection

- **UI:** One text box initially; when the user enters content and adds an entry, a new box appears below. **Maximum 10 text boxes per day.** Each box can contain a word, phrase, sentence, or paragraph (any format).
- **Storage:** Each entry stored with id, text, timestamp (and optionally order). Day-level structure: date, list of entries, status (e.g., in_progress, completed), last_updated. Persisted to JSON (e.g., `data/daily_entries.json`) or SQLite.
- **State:** Streamlit `st.session_state` for current day’s entries; dynamic `st.text_area()` widgets; "Add Entry" (or similar) to append; optional delete/reorder.
- **Day handling:** When date changes (e.g., after midnight), previous day is locked and becomes input for Phase 2; new day starts with empty entries.
- **Auto-save:** E.g., every 30 seconds and on add/edit/delete to avoid data loss.
- **Tools:** streamlit, json, datetime, threading (for background save).

**Data structure example (per day):**
```json
{
  "2026-01-26": {
    "entries": [
      {"id": 1, "text": "exam today", "timestamp": "2026-01-26T08:30:00"},
      {"id": 2, "text": "stressed", "timestamp": "2026-01-26T10:15:00"}
    ],
    "date": "2026-01-26",
    "status": "in_progress",
    "last_updated": "2026-01-26T14:20:00",
    "box_count": 2
  }
}
```

### Phase 2: Diary Generation and Emotion Analysis

- **Trigger:** At 12:00 AM (midnight), or on next app open, process the previous calendar day’s entries.
- **Diary generation:** All entries for that day are sent to an LLM (e.g., OpenAI GPT API or HuggingFace) with a prompt such as: "Create a coherent, first-person diary entry from these daily notes: [entries]. Make it reflective and natural."
- **Emotion analysis:** The generated diary text is passed to the **existing RoBERTa 3-class model** (same as in the current Streamlit app). Output: emotion (positive/neutral/negative) and confidence.
- **Storage:** For that date, save: entries, generated_diary, emotion, confidence, generated_at (timestamp). Status set to completed.
- **Tools:** openai or transformers (LLM), torch + transformers (RoBERTa), apscheduler or similar for 12 AM job (or on-open check).

**Output structure example:**
```json
{
  "date": "2026-01-26",
  "generated_diary": "Today I had an exam which made me feel stressed...",
  "emotion": "negative",
  "confidence": 0.78,
  "generated_at": "2026-01-27T00:00:00"
}
```

### Phase 3: Calendar Visualization and Day Detail

- **Calendar:** Monthly (or weekly) view. Each day is **color-coded by emotion** with **gradient intensity by confidence**:
  - **Positive:** White → light green → dark green.
  - **Neutral:** White → light yellow → dark yellow.
  - **Negative:** White → light orange → dark red.
  Formula idea: color intensity = base_color × confidence (e.g., high confidence → darker).
- **Interaction:** Clicking a date opens that day’s detail: all 10 (or fewer) entries with timestamps, the generated diary, emotion label, and confidence. Option to edit that day (e.g., regenerate diary or modify entries and re-run Phase 2).
- **Tools:** streamlit-calendar or custom Plotly calendar; datetime; JSON read by date.

### Phase 4: Insights and Analytics

- **Patterns:** Day-of-week (e.g., "You're more positive on weekends"), weekly trend (improving/declining), streaks (consecutive positive/negative days).
- **Keyword–emotion:** Most frequent words on positive vs negative days (e.g., NLTK tokenization, TF-IDF or counts); simple correlation between keywords and emotion.
- **Visualizations:** 7-day mood trend line (Plotly), weekly/monthly bar or heatmap (e.g., seaborn), optional word clouds per emotion.
- **Predictions (optional):** Simple rule-based "tomorrow’s mood" from day-of-week and recent trend.
- **Recommendations (optional):** Short actionable text (e.g., "Take breaks on Mondays") based on patterns.
- **Tools:** pandas, numpy, scipy (e.g., correlation, trend), sklearn (TF-IDF), nltk, plotly, matplotlib, seaborn, wordcloud.

---

## 13. Features (Consolidated List)

- Daily mood entry via **dynamic text boxes** (max 10 per day; any format).
- **Automatic diary generation** at midnight from the day’s entries (LLM).
- **Emotion classification** of the generated diary (RoBERTa 3-class).
- **Calendar** with emotion-based color gradient (white → green / yellow / orange–red).
- **Day detail view:** entries, diary, emotion, confidence; edit/regenerate option.
- **Weekly summary:** counts, trend line, simple pattern insights.
- **Insights:** day-of-week patterns, keyword–emotion correlation, streaks, optional forecasts and recommendations.
- **Export (optional):** weekly report (PDF/CSV).
- **Privacy (optional):** local-only storage or optional sync.

---

## 14. Technical Choices Summary

- **Frontend:** Streamlit.
- **NLP model:** Existing fine-tuned RoBERTa 3-class (74.64% accuracy, F1 0.7439).
- **LLM:** OpenAI API (e.g., gpt-3.5-turbo) or HuggingFace (e.g., T5, GPT-2) for diary generation.
- **Storage:** JSON file(s) or SQLite for daily entries and generated diaries.
- **Scheduling:** APScheduler for 12 AM job, or "process yesterday" on app open.
- **Visualization:** Plotly (trends), calendar widget or Plotly grid, seaborn/matplotlib for heatmaps/bar charts.

---

## 15. Literature (6 Papers for Related Work)

1. **Kastrati et al.** – Sentiment Analysis of Students' Feedback with NLP and Deep Learning: A Systematic Mapping Study (Applied Sciences, 2021). Use for: sentiment/emotion in education, student feedback, NLP/DL overview.
2. **Caldeira et al.** – Mobile apps for mood tracking: an analysis of features and user reviews (AMIA, 2018). Use for: mood-tracking app landscape, personal informatics (collection, reflection, action).
3. **Schueller et al.** – Understanding People's Use of and Perspectives on Mood-Tracking Apps: Interview Study (JMIR Mental Health, 2021). Use for: user motivations, usefulness of visualization, gaps (e.g., recommendations).
4. **Cortiz** – Exploring Transformers for Emotion Recognition: BERT, DistilBERT, RoBERTa, XLNET and ELECTRA (CCRIS, 2022). Use for: GoEmotions, RoBERTa for emotion recognition, methodology.
5. **Shin et al.** – Using Large Language Models to Detect Depression From User-Generated Diary Text… (JMIR, 2024). Use for: diary text + LLM in mental health screening.
6. **Nepal et al.** – Contextual AI Journaling: Integrating LLM and Time Series Behavioral Sensing… MindScape App (CHI EA, 2024). Use for: LLM + journaling for college students, self-reflection, well-being.

**Order for writing:** Kastrati → Caldeira → Schueller → Cortiz → Shin → Nepal (general/education → mood apps → user perspective → emotion tech → diary+LLM → student LLM journaling).

---

## 16. Presentation Structure (Short Version)

- **Slide 1:** Project overview – what (student mood tracking, keyword→diary→emotion), why (mental health, patterns, academic correlation), how (4 phases), tech stack (Streamlit, RoBERTa, LLM, JSON, Plotly, etc.).
- **Slide 2:** Phase 1 – Dynamic entry system (Streamlit, session state, dynamic text areas, max 10, JSON, datetime, auto-save).
- **Slide 3:** Phase 2 – LLM diary generation + RoBERTa emotion classification (OpenAI/HuggingFace, fine-tuned RoBERTa, midnight processing, e.g., APScheduler).
- **Slide 4:** Phase 3 – Color-coded calendar (gradient by emotion and confidence), day detail, edit.
- **Slide 5:** Phase 4 – Insights (patterns, trends, keyword–emotion, visualizations, optional predictions/recommendations).
- **Slide 6 (optional):** Architecture diagram, data flow, model specs (RoBERTa 3-class, 74.64% accuracy).

---

## 17. Research vs Project and Data

- **Classification:** Primarily an **application project** (build a working system); optional **research** angle (e.g., evaluating diary quality or emotion consistency on LLM-generated text).
- **Outcome:** A working student mood-tracking app with daily keyword-style input, auto-generated diary, emotion labels, calendar, and insights.
- **Data to start:** No new dataset required to **start**. The existing RoBERTa 3-class model is used as-is. For **demo and insights**, use simulated or real usage (e.g., 2–4 weeks of daily entries). For **evaluation**, a small set of human-labeled days (diary + emotion) can be used to compare system vs human labels.

---

## 18. Implementation Order Suggestion

1. Phase 1: Dynamic text boxes (max 10), session state, JSON save, day detection.
2. Phase 2: LLM integration (prompt + API), RoBERTa 3-class on generated diary, save diary + emotion.
3. Phase 3: Calendar component, color gradient, day-detail view, edit/regenerate.
4. Phase 4: Weekly summary, pattern detection, visualizations, optional recommendations.

---

This note is intended as the single reference for both the **completed MoodMirror emotion detection project** and the **extended MoodMirror student mood tracker idea**, including every technical and conceptual detail discussed and present in the repository.
