import os
import json
import torch
from transformers import (
    RobertaTokenizer,
    RobertaForSequenceClassification,
    DistilBertTokenizer,
    DistilBertForSequenceClassification
)
import joblib
import warnings

warnings.filterwarnings("ignore")


class EmotionPredictor:
    
    def __init__(self, model_path, emotion_mapping_path):
        self.model_path = model_path
        self.emotion_mapping_path = emotion_mapping_path
        self.model = None
        self.tokenizer = None
        self.emotion_to_id = None
        self.id_to_emotion = None
        self.num_labels = None
        
    def load_emotion_mapping(self):
        with open(self.emotion_mapping_path, 'r') as f:
            emotion_mapping = json.load(f)
        
        self.emotion_to_id = emotion_mapping['emotion_to_id']
        self.id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
        self.num_labels = len(self.emotion_to_id)
        
    def predict(self, text):
        raise NotImplementedError


class RoBERTaPredictor(EmotionPredictor):
    
    def __init__(self, model_path, emotion_mapping_path):
        super().__init__(model_path, emotion_mapping_path)
        self.load_model()
        
    def load_model(self):
        self.load_emotion_mapping()
        
        self.tokenizer = RobertaTokenizer.from_pretrained(self.model_path)
        self.model = RobertaForSequenceClassification.from_pretrained(
            self.model_path,
            num_labels=self.num_labels
        )
        self.model.eval()
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        
    def predict(self, text):
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=128,
            return_tensors="pt"
        )
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            predictions = torch.nn.functional.softmax(logits, dim=-1)
            predicted_id = torch.argmax(predictions, dim=-1).item()
            confidence = predictions[0][predicted_id].item()
        
        emotion = self.id_to_emotion[predicted_id]
        return emotion, confidence


class DistilBERTPredictor(EmotionPredictor):
    
    def __init__(self, model_path, emotion_mapping_path):
        super().__init__(model_path, emotion_mapping_path)
        self.load_model()
        
    def load_model(self):
        self.load_emotion_mapping()
        
        self.tokenizer = DistilBertTokenizer.from_pretrained(self.model_path)
        self.model = DistilBertForSequenceClassification.from_pretrained(
            self.model_path,
            num_labels=self.num_labels
        )
        self.model.eval()
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        
    def predict(self, text):
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=128,
            return_tensors="pt"
        )
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            predictions = torch.nn.functional.softmax(logits, dim=-1)
            predicted_id = torch.argmax(predictions, dim=-1).item()
            confidence = predictions[0][predicted_id].item()
        
        emotion = self.id_to_emotion[predicted_id]
        return emotion, confidence


class LogisticRegressionPredictor:
    
    def __init__(self, model_path, vectorizer_path, emotion_mapping_path):
        self.model_path = model_path
        self.vectorizer_path = vectorizer_path
        self.emotion_mapping_path = emotion_mapping_path
        self.model = None
        self.vectorizer = None
        self.emotion_to_id = None
        self.id_to_emotion = None
        self.load_model()
        
    def load_model(self):
        with open(self.emotion_mapping_path, 'r') as f:
            emotion_mapping = json.load(f)
        
        self.emotion_to_id = emotion_mapping['emotion_to_id']
        self.id_to_emotion = {int(k): v for k, v in emotion_mapping['id_to_emotion'].items()}
        
        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            self.model = joblib.load(self.model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
        else:
            raise FileNotFoundError(
                f"Model files not found. Please ensure {self.model_path} and {self.vectorizer_path} exist."
            )
        
    def predict(self, text):
        text_vectorized = self.vectorizer.transform([text])
        
        predicted_id = self.model.predict(text_vectorized)[0]
        probabilities = self.model.predict_proba(text_vectorized)[0]
        confidence = probabilities[predicted_id]
        
        emotion = self.id_to_emotion[predicted_id]
        return emotion, confidence


def load_roberta_3class_predictor(base_path="."):
    model_path = os.path.join(base_path, "models", "roberta_emotion_model_3class")
    emotion_mapping_path = os.path.join(base_path, "data", "processed", "emotion_mapping_3class.json")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")
    if not os.path.exists(emotion_mapping_path):
        raise FileNotFoundError(f"Emotion mapping not found at {emotion_mapping_path}")
    
    return RoBERTaPredictor(model_path, emotion_mapping_path)

