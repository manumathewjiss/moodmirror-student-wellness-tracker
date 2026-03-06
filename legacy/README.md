# MoodMirror - Emotion Detection Project

A comprehensive NLP project for emotion classification using transformer-based models and traditional machine learning approaches.

## Project Overview

This project implements and compares multiple models for emotion detection from text:
- **Baseline Model**: Logistic Regression with TF-IDF features
- **DistilBERT**: Fine-tuned DistilBERT model for emotion classification
- **RoBERTa**: Fine-tuned RoBERTa model (7-class and 3-class variants)

## Dataset

The project uses the **GoEmotions** dataset from HuggingFace, which contains 54,263 text samples labeled with emotions. The dataset is processed to map 27 original emotions to 7 simplified categories (or 3 categories for the simplified model).

## Project Structure

```
.
├── data/
│   ├── raw/              # Raw dataset files
│   └── processed/       # Preprocessed data and emotion mappings
├── models/              # Trained model files
│   ├── distilbert_emotion_model/
│   ├── roberta_emotion_model/
│   └── roberta_emotion_model_3class/
├── notebooks/           # Jupyter notebooks for analysis and training
│   ├── 00_download_dataset.ipynb
│   ├── 01_data_exploration.ipynb
│   ├── 02_data_preprocessing.ipynb
│   ├── 03_baseline_models.ipynb
│   ├── 04_distilbert_training.ipynb
│   ├── 05_roberta_training.ipynb
│   └── ...
├── results/             # Model evaluation results and visualizations
│   ├── figures/         # Confusion matrices and performance plots
│   └── models/           # Evaluation metrics CSV files
├── src/                 # Source code
│   ├── model_inference.py      # Model loading and prediction
│   ├── model_evaluation.py     # Model evaluation utilities
│   └── deployment/
│       └── emotion_app.py       # Streamlit web application
└── requirements.txt     # Python dependencies
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Darsh NLP project"
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Running the Notebooks

Execute the notebooks in order:
1. `00_download_dataset.ipynb` - Download and prepare the dataset
2. `01_data_exploration.ipynb` - Explore data characteristics
3. `02_data_preprocessing.ipynb` - Clean and preprocess text data
4. `03_baseline_models.ipynb` - Train baseline Logistic Regression model
5. `04_distilbert_training.ipynb` - Fine-tune DistilBERT model
6. `05_roberta_training.ipynb` - Fine-tune RoBERTa model
7. Additional notebooks for 3-class classification

### Using the Models

#### Python API

```python
from src.model_inference import load_roberta_3class_predictor

# Load the model
predictor = load_roberta_3class_predictor()

# Make predictions
emotion, confidence = predictor.predict("I'm feeling great today!")
print(f"Emotion: {emotion}, Confidence: {confidence:.2f}")
```

#### Streamlit Web App

Run the interactive web application:
```bash
streamlit run src/deployment/emotion_app.py
```

### Model Evaluation

Run the evaluation script to compare all models:
```bash
python src/model_evaluation.py
```

This will generate:
- Model comparison metrics (CSV)
- Confusion matrices for each model
- Performance visualization plots

## Model Performance

The project includes evaluation results for:
- **Logistic Regression Baseline**: Traditional ML approach
- **DistilBERT**: Lightweight transformer model
- **RoBERTa (7-class)**: Full transformer model with 7 emotion categories
- **RoBERTa (3-class)**: Simplified model with positive/neutral/negative

Results are saved in `results/models/model_comparison.csv` and visualizations in `results/figures/`.

## Key Features

- **Multiple Model Architectures**: Compare traditional ML and transformer-based approaches
- **Comprehensive Evaluation**: Accuracy, precision, recall, F1-score, and confusion matrices
- **Interactive Demo**: Streamlit web application for real-time predictions
- **Well-Documented**: Detailed notebooks explaining each step of the pipeline

## Requirements

- Python 3.8+
- PyTorch 2.0+
- Transformers 4.35+
- See `requirements.txt` for complete list

## License

[Add your license information here]

## Authors

[Add author information here]

## Acknowledgments

- GoEmotions dataset from HuggingFace
- Transformers library by HuggingFace
- Streamlit for the web interface

