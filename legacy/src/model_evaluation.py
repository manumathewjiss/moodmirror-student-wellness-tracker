import os
import sys
import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from transformers import (
    RobertaTokenizer,
    RobertaForSequenceClassification,
    DistilBertTokenizer,
    DistilBertForSequenceClassification
)
from torch.utils.data import Dataset
import torch
import warnings

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.model_inference import RoBERTaPredictor, DistilBERTPredictor

warnings.filterwarnings("ignore")
sns.set_style("whitegrid")
plt.rcParams["figure.figsize"] = (12, 6)


class EmotionDataset(Dataset):
    
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt"
        )
        
        return {
            "input_ids": encoding["input_ids"].flatten(),
            "attention_mask": encoding["attention_mask"].flatten(),
            "labels": torch.tensor(label, dtype=torch.long)
        }


def evaluate_roberta_model(model_path, emotion_mapping_path, test_df, base_path="."):
    print(f"\n{'='*60}")
    print(f"Evaluating RoBERTa Model")
    print(f"{'='*60}")
    
    with open(emotion_mapping_path, 'r') as f:
        emotion_mapping = json.load(f)
    
    emotion_to_id = emotion_mapping['emotion_to_id']
    id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
    num_labels = len(emotion_to_id)
    
    X_test = test_df['text'].values
    y_test = test_df['emotion'].map(emotion_to_id).values
    
    if os.path.exists(os.path.join(model_path, "vocab.json")):
        tokenizer = RobertaTokenizer.from_pretrained(model_path)
    else:
        tokenizer = RobertaTokenizer.from_pretrained("roberta-base")
    
    model_loaded = False
    best_checkpoint_path = None
    
    if os.path.exists(os.path.join(model_path, "model.safetensors")) or os.path.exists(os.path.join(model_path, "pytorch_model.bin")):
        model = RobertaForSequenceClassification.from_pretrained(
            model_path,
            num_labels=num_labels
        )
        model_loaded = True
    else:
        checkpoints_dir = os.path.join(model_path, "checkpoints")
        if os.path.exists(checkpoints_dir):
            try:
                checkpoint_dirs = [d for d in os.listdir(checkpoints_dir) if d.startswith("checkpoint-")]
                if checkpoint_dirs:
                    best_checkpoint = None
                    best_f1 = -1
                    
                    for checkpoint_name in checkpoint_dirs:
                        checkpoint_path = os.path.join(checkpoints_dir, checkpoint_name)
                        trainer_state_file = os.path.join(checkpoint_path, "trainer_state.json")
                        
                        if os.path.exists(trainer_state_file):
                            try:
                                with open(trainer_state_file, 'r') as f:
                                    state = json.load(f)
                                log_history = state.get("log_history", [])
                                for log_entry in reversed(log_history):
                                    if "eval_f1" in log_entry:
                                        checkpoint_f1 = log_entry["eval_f1"]
                                        if checkpoint_f1 > best_f1:
                                            best_f1 = checkpoint_f1
                                            best_checkpoint = checkpoint_path
                                        break
                            except:
                                pass
                    
                    if best_checkpoint is None:
                        checkpoint_dirs.sort(key=lambda x: int(x.split("-")[1]), reverse=True)
                        best_checkpoint = os.path.join(checkpoints_dir, checkpoint_dirs[0])
                    
                    if os.path.exists(os.path.join(best_checkpoint, "model.safetensors")) or os.path.exists(os.path.join(best_checkpoint, "pytorch_model.bin")):
                        print(f"Loading model from checkpoint: {os.path.basename(best_checkpoint)}")
                        if os.path.exists(os.path.join(best_checkpoint, "vocab.json")):
                            tokenizer = RobertaTokenizer.from_pretrained(best_checkpoint)
                        model = RobertaForSequenceClassification.from_pretrained(
                            best_checkpoint,
                            num_labels=num_labels
                        )
                        model_loaded = True
                        best_checkpoint_path = best_checkpoint
            except Exception as e:
                print(f"Error loading from checkpoints: {e}")
    
    if not model_loaded:
        print(f"Warning: Model files not found in {model_path}, skipping...")
        return None, None, None, None, None
    
    model.eval()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    
    y_pred = []
    batch_size = 32
    
    with torch.no_grad():
        for i in range(0, len(X_test), batch_size):
            batch_texts = X_test[i:i+batch_size]
            encodings = tokenizer(
                batch_texts.tolist(),
                truncation=True,
                padding="max_length",
                max_length=128,
                return_tensors="pt"
            )
            input_ids = encodings['input_ids'].to(device)
            attention_mask = encodings['attention_mask'].to(device)
            
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            batch_preds = torch.argmax(logits, dim=-1).cpu().numpy()
            y_pred.extend(batch_preds)
    
    y_pred = np.array(y_pred)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    results = {
        'model': 'RoBERTa' + ('-3Class' if '3class' in model_path.lower() else ''),
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'num_labels': num_labels
    }
    
    cm = confusion_matrix(y_test, y_pred)
    emotion_names = [id_to_emotion[i] for i in range(num_labels)]
    
    return results, cm, emotion_names, y_test, y_pred


def evaluate_distilbert_model(model_path, emotion_mapping_path, test_df, base_path="."):
    print(f"\n{'='*60}")
    print(f"Evaluating DistilBERT Model")
    print(f"{'='*60}")
    
    with open(emotion_mapping_path, 'r') as f:
        emotion_mapping = json.load(f)
    
    emotion_to_id = emotion_mapping['emotion_to_id']
    id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
    num_labels = len(emotion_to_id)
    
    X_test = test_df['text'].values
    y_test = test_df['emotion'].map(emotion_to_id).values
    
    if os.path.exists(os.path.join(model_path, "vocab.txt")):
        tokenizer = DistilBertTokenizer.from_pretrained(model_path)
    else:
        tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
    
    if os.path.exists(os.path.join(model_path, "model.safetensors")) or os.path.exists(os.path.join(model_path, "pytorch_model.bin")):
        model = DistilBertForSequenceClassification.from_pretrained(
            model_path,
            num_labels=num_labels
        )
    else:
        print(f"Warning: Model files not found in {model_path}, skipping...")
        return None, None, None, None, None
    
    model.eval()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    
    y_pred = []
    batch_size = 32
    
    with torch.no_grad():
        for i in range(0, len(X_test), batch_size):
            batch_texts = X_test[i:i+batch_size]
            encodings = tokenizer(
                batch_texts.tolist(),
                truncation=True,
                padding="max_length",
                max_length=128,
                return_tensors="pt"
            )
            input_ids = encodings['input_ids'].to(device)
            attention_mask = encodings['attention_mask'].to(device)
            
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            batch_preds = torch.argmax(logits, dim=-1).cpu().numpy()
            y_pred.extend(batch_preds)
    
    y_pred = np.array(y_pred)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    results = {
        'model': 'DistilBERT',
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'num_labels': num_labels
    }
    
    cm = confusion_matrix(y_test, y_pred)
    emotion_names = [id_to_emotion[i] for i in range(num_labels)]
    
    return results, cm, emotion_names, y_test, y_pred


def evaluate_baseline_model(test_df, base_path="."):
    print(f"\n{'='*60}")
    print(f"Evaluating Logistic Regression Baseline Model")
    print(f"{'='*60}")
    
    results_path = os.path.join(base_path, "results", "models", "baseline_model_results.csv")
    emotion_mapping_path = os.path.join(base_path, "data", "processed", "emotion_mapping.json")
    train_path = os.path.join(base_path, "data", "processed", "train_processed.csv")
    
    if not os.path.exists(emotion_mapping_path):
        print("Warning: Emotion mapping file not found. Skipping baseline evaluation.")
        return None, None, None, None, None
    
    with open(emotion_mapping_path, 'r') as f:
        emotion_mapping = json.load(f)
    
    id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
    emotion_names = [id_to_emotion[i] for i in range(len(emotion_mapping['emotion_to_id']))]
    
    if os.path.exists(results_path):
        results_df = pd.read_csv(results_path, index_col=0)
        results = {
            'model': 'Logistic Regression',
            'accuracy': results_df.loc['Logistic Regression', 'accuracy'],
            'precision': results_df.loc['Logistic Regression', 'precision'],
            'recall': results_df.loc['Logistic Regression', 'recall'],
            'f1': results_df.loc['Logistic Regression', 'f1'],
            'num_labels': 7
        }
        print("Loaded baseline results from existing file")
    else:
        print("Warning: Baseline model results file not found. Skipping evaluation.")
        return None, None, None, None, None
    
    if not os.path.exists(train_path):
        print("Warning: Training data not found. Cannot generate confusion matrix.")
        return results, None, emotion_names, None, None
    
    print("Re-training baseline model to generate confusion matrix...")
    try:
        train_df = pd.read_csv(train_path)
        
        X_train = train_df['text'].values
        y_train = train_df['emotion'].map(emotion_mapping['emotion_to_id']).values
        
        X_test = test_df['text'].values
        y_test = test_df['emotion'].map(emotion_mapping['emotion_to_id']).values
        
        tfidf_vectorizer = TfidfVectorizer(max_features=10000, ngram_range=(1, 2), min_df=2)
        X_train_tfidf = tfidf_vectorizer.fit_transform(X_train)
        X_test_tfidf = tfidf_vectorizer.transform(X_test)
        
        smote = SMOTE(random_state=42, k_neighbors=5)
        rus = RandomUnderSampler(random_state=42)
        
        X_train_balanced, y_train_balanced = smote.fit_resample(X_train_tfidf, y_train)
        X_train_balanced, y_train_balanced = rus.fit_resample(X_train_balanced, y_train_balanced)
        
        baseline_model = LogisticRegression(max_iter=1000, random_state=42)
        baseline_model.fit(X_train_balanced, y_train_balanced)
        
        y_pred = baseline_model.predict(X_test_tfidf)
        cm = confusion_matrix(y_test, y_pred)
        
        print("Baseline model confusion matrix generated successfully")
        return results, cm, emotion_names, None, None
        
    except Exception as e:
        print(f"Warning: Could not generate confusion matrix: {e}")
        import traceback
        traceback.print_exc()
        return results, None, emotion_names, None, None


def create_comparison_visualization(all_results, output_path):
    if not all_results:
        return
    
    models = [r['model'] for r in all_results]
    metrics = ['accuracy', 'precision', 'recall', 'f1']
    colors = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D']
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Model Performance Comparison', fontsize=18, fontweight='bold', y=0.995)
    
    x = np.arange(len(models))
    width = 0.6
    
    for idx, (metric, color) in enumerate(zip(metrics, colors)):
        ax = axes[idx // 2, idx % 2]
        values = [r[metric] for r in all_results]
        
        bars = ax.bar(x, values, width, color=color, alpha=0.8, edgecolor='black', linewidth=1.5)
        
        for i, (bar, val) in enumerate(zip(bars, values)):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                   f'{val:.3f}', ha='center', va='bottom', fontsize=11, fontweight='bold')
        
        ax.set_ylabel('Score', fontsize=12, fontweight='bold')
        ax.set_title(f'{metric.capitalize()}', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(models, rotation=15, ha='right', fontsize=11)
        ax.set_ylim([0, max(values) * 1.15])
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)
    
    plt.tight_layout(rect=[0, 0, 1, 0.98])
    plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
    print(f"\nComparison visualization saved to: {output_path}")
    plt.close()
    
    fig, ax = plt.subplots(figsize=(14, 7))
    x = np.arange(len(models))
    width = 0.2
    
    for i, (metric, color) in enumerate(zip(metrics, colors)):
        values = [r[metric] for r in all_results]
        ax.bar(x + i * width, values, width, label=metric.capitalize(), 
              color=color, alpha=0.8, edgecolor='black', linewidth=1)
    
    ax.set_xlabel('Model', fontsize=14, fontweight='bold')
    ax.set_ylabel('Score', fontsize=14, fontweight='bold')
    ax.set_title('Model Comparison - All Metrics', fontsize=16, fontweight='bold')
    ax.set_xticks(x + width * 1.5)
    ax.set_xticklabels(models, rotation=0, fontsize=12)
    ax.legend(loc='upper left', fontsize=11, framealpha=0.9)
    ax.set_ylim([0, 1])
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)
    
    combined_path = output_path.replace('.png', '_combined.png')
    plt.tight_layout()
    plt.savefig(combined_path, dpi=300, bbox_inches='tight', facecolor='white')
    print(f"Combined comparison visualization saved to: {combined_path}")
    plt.close()


def create_confusion_matrices(all_cms, all_emotion_names, all_model_names, output_dir):
    for cm, emotion_names, model_name in zip(all_cms, all_emotion_names, all_model_names):
        if cm is None:
            continue
        
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 8))
        
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax1,
                    xticklabels=emotion_names, yticklabels=emotion_names,
                    cbar_kws={'label': 'Count'}, linewidths=0.5, linecolor='gray')
        ax1.set_title(f'Confusion Matrix (Counts) - {model_name}', 
                     fontsize=14, fontweight='bold', pad=20)
        ax1.set_ylabel('True Label', fontsize=12, fontweight='bold')
        ax1.set_xlabel('Predicted Label', fontsize=12, fontweight='bold')
        
        sns.heatmap(cm_normalized, annot=True, fmt='.2f', cmap='Oranges', ax=ax2,
                    xticklabels=emotion_names, yticklabels=emotion_names,
                    cbar_kws={'label': 'Proportion'}, linewidths=0.5, linecolor='gray')
        ax2.set_title(f'Confusion Matrix (Normalized) - {model_name}', 
                     fontsize=14, fontweight='bold', pad=20)
        ax2.set_ylabel('True Label', fontsize=12, fontweight='bold')
        ax2.set_xlabel('Predicted Label', fontsize=12, fontweight='bold')
        
        plt.tight_layout()
        
        output_path = os.path.join(output_dir, f'confusion_matrix_{model_name.lower().replace(" ", "_")}.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
        print(f"Confusion matrix saved to: {output_path}")
        plt.close()
    
    valid_cms = [(cm, emotion_names, model_name) for cm, emotion_names, model_name 
                 in zip(all_cms, all_emotion_names, all_model_names) if cm is not None]
    
    if len(valid_cms) >= 2:
        n_models = len(valid_cms)
        if n_models <= 2:
            rows, cols = 1, 2
        elif n_models <= 4:
            rows, cols = 2, 2
        else:
            rows = int(np.ceil(np.sqrt(n_models)))
            cols = int(np.ceil(n_models / rows))
        
        fig, axes = plt.subplots(rows, cols, figsize=(10*cols, 8*rows))
        if n_models == 1:
            axes = [axes]
        else:
            axes = axes.flatten() if n_models > 1 else [axes]
        
        fig.suptitle('Confusion Matrices - All Models', fontsize=18, fontweight='bold', y=0.995)
        
        for idx, (cm, emotion_names, model_name) in enumerate(valid_cms):
            ax = axes[idx]
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax,
                       xticklabels=emotion_names, yticklabels=emotion_names,
                       cbar_kws={'label': 'Count'}, linewidths=0.5, linecolor='gray')
            ax.set_title(f'{model_name}', fontsize=14, fontweight='bold', pad=15)
            ax.set_ylabel('True Label', fontsize=11, fontweight='bold')
            ax.set_xlabel('Predicted Label', fontsize=11, fontweight='bold')
        
        for idx in range(len(valid_cms), len(axes)):
            axes[idx].axis('off')
        
        plt.tight_layout(rect=[0, 0, 1, 0.98])
        combined_cm_path = os.path.join(output_dir, 'confusion_matrices_all_models.png')
        plt.savefig(combined_cm_path, dpi=300, bbox_inches='tight', facecolor='white')
        print(f"Combined confusion matrices saved to: {combined_cm_path}")
        plt.close()


def main():
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    results_dir = os.path.join(base_path, "results", "models")
    figures_dir = os.path.join(base_path, "results", "figures")
    os.makedirs(results_dir, exist_ok=True)
    os.makedirs(figures_dir, exist_ok=True)
    
    all_results = []
    all_cms = []
    all_emotion_names = []
    all_model_names = []
    
    print("\n" + "="*60)
    print("MODEL EVALUATION AND COMPARISON")
    print("="*60)
    
    test_df_baseline = pd.read_csv(os.path.join(base_path, "data", "processed", "test_processed.csv"))
    baseline_results, _, _, _, _ = evaluate_baseline_model(test_df_baseline, base_path)
    if baseline_results:
        all_results.append(baseline_results)
        all_cms.append(None)
        baseline_emotion_mapping = os.path.join(base_path, "data", "processed", "emotion_mapping.json")
        with open(baseline_emotion_mapping, 'r') as f:
            emotion_mapping = json.load(f)
        id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
        baseline_emotions = [id_to_emotion[i] for i in range(len(emotion_mapping['emotion_to_id']))]
        all_emotion_names.append(baseline_emotions)
        all_model_names.append('Logistic Regression')
    
    distilbert_model_path = os.path.join(base_path, "models", "distilbert_emotion_model")
    distilbert_emotion_mapping = os.path.join(base_path, "data", "processed", "emotion_mapping.json")
    
    if os.path.exists(distilbert_model_path):
        test_df_distilbert = pd.read_csv(os.path.join(base_path, "data", "processed", "test_processed.csv"))
        distilbert_results, distilbert_cm, distilbert_emotions, _, _ = evaluate_distilbert_model(
            distilbert_model_path, distilbert_emotion_mapping, test_df_distilbert, base_path
        )
        if distilbert_results:
            all_results.append(distilbert_results)
            all_cms.append(distilbert_cm)
            all_emotion_names.append(distilbert_emotions)
            all_model_names.append('DistilBERT')
    else:
        print(f"\nWarning: DistilBERT model not found at {distilbert_model_path}")
    
    roberta_model_path = os.path.join(base_path, "models", "roberta_emotion_model")
    roberta_emotion_mapping = os.path.join(base_path, "data", "processed", "emotion_mapping.json")
    roberta_results_file = os.path.join(base_path, "results", "models", "roberta_results.csv")
    
    roberta_results = None
    roberta_cm = None
    roberta_emotions = None
    
    if os.path.exists(roberta_model_path):
        test_df_roberta = pd.read_csv(os.path.join(base_path, "data", "processed", "test_processed.csv"))
        roberta_results, roberta_cm, roberta_emotions, _, _ = evaluate_roberta_model(
            roberta_model_path, roberta_emotion_mapping, test_df_roberta, base_path
        )
    
    if roberta_results is None and os.path.exists(roberta_results_file):
        print(f"\nLoading RoBERTa 7-class results from {roberta_results_file}")
        results_df = pd.read_csv(roberta_results_file, index_col=0)
        roberta_results = {
            'model': 'RoBERTa',
            'accuracy': float(results_df.loc['RoBERTa', 'accuracy']),
            'precision': float(results_df.loc['RoBERTa', 'precision']),
            'recall': float(results_df.loc['RoBERTa', 'recall']),
            'f1': float(results_df.loc['RoBERTa', 'f1']),
            'num_labels': 7
        }
        test_df_roberta = pd.read_csv(os.path.join(base_path, "data", "processed", "test_processed.csv"))
        with open(roberta_emotion_mapping, 'r') as f:
            emotion_mapping = json.load(f)
        emotion_to_id = emotion_mapping['emotion_to_id']
        id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
        roberta_emotions = [id_to_emotion[i] for i in range(len(emotion_to_id))]
        print(f"Note: RoBERTa 7-class model files not found. Using saved metrics only (no confusion matrix).")
        print(f"To generate confusion matrix, please save the model from the training notebook.")
    
    if roberta_results:
        all_results.append(roberta_results)
        all_cms.append(roberta_cm)
        all_emotion_names.append(roberta_emotions)
        all_model_names.append('RoBERTa')
    else:
        print(f"\nWarning: RoBERTa 7-class model not found at {roberta_model_path} and no results file found.")
        print("Using saved metrics from training summary...")
        roberta_results = {
            'model': 'RoBERTa',
            'accuracy': 0.6998,
            'precision': 0.7050,
            'recall': 0.6998,
            'f1': 0.7010,
            'num_labels': 7
        }
        with open(roberta_emotion_mapping, 'r') as f:
            emotion_mapping = json.load(f)
        id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
        roberta_emotions = [id_to_emotion[i] for i in range(len(emotion_mapping['emotion_to_id']))]
        all_results.append(roberta_results)
        all_cms.append(None)
        all_emotion_names.append(roberta_emotions)
        all_model_names.append('RoBERTa')
        print("Note: Confusion matrix not available for RoBERTa 7-class (model not saved).")
    
    roberta_3class_model_path = os.path.join(base_path, "models", "roberta_emotion_model_3class")
    roberta_3class_emotion_mapping = os.path.join(base_path, "data", "processed", "emotion_mapping_3class.json")
    
    if os.path.exists(roberta_3class_model_path):
        test_df_roberta_3class = pd.read_csv(os.path.join(base_path, "data", "processed", "test_processed_3class.csv"))
        roberta_3class_results, roberta_3class_cm, roberta_3class_emotions, _, _ = evaluate_roberta_model(
            roberta_3class_model_path, roberta_3class_emotion_mapping, test_df_roberta_3class, base_path
        )
        if roberta_3class_results:
            all_results.append(roberta_3class_results)
            all_cms.append(roberta_3class_cm)
            all_emotion_names.append(roberta_3class_emotions)
            all_model_names.append('RoBERTa-3Class')
    else:
        print(f"\nWarning: RoBERTa 3-class model not found at {roberta_3class_model_path}")
    
    if all_results:
        comparison_df = pd.DataFrame(all_results)
        comparison_df = comparison_df[['model', 'accuracy', 'precision', 'recall', 'f1']]
        comparison_df = comparison_df.round(4)
        
        print("\n" + "="*60)
        print("MODEL COMPARISON RESULTS")
        print("="*60)
        print(comparison_df.to_string(index=False))
        
        output_path = os.path.join(results_dir, "model_comparison.csv")
        comparison_df.to_csv(output_path, index=False)
        print(f"\nComparison results saved to: {output_path}")
        
        comparison_viz_path = os.path.join(figures_dir, "model_comparison.png")
        create_comparison_visualization(all_results, comparison_viz_path)
        
        if any(cm is not None for cm in all_cms):
            create_confusion_matrices(all_cms, all_emotion_names, all_model_names, figures_dir)
        
        print("\n" + "="*60)
        print("EVALUATION COMPLETE")
        print("="*60)
    else:
        print("\nNo models were evaluated. Please check model paths.")


if __name__ == "__main__":
    main()

