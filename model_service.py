import torch
import torch.nn as nn
import numpy as np
from gensim.models import Word2Vec
import re

# Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Define LSTM model (same as in your original code)
class LSTMModel(nn.Module):
    def __init__(self, embedding_matrix, hidden_dim, output_dim):
        super(LSTMModel, self).__init__()
        self.embedding = nn.Embedding.from_pretrained(torch.FloatTensor(embedding_matrix), freeze=False)
        self.lstm = nn.LSTM(input_size=100, hidden_size=hidden_dim, num_layers=1, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        x = self.embedding(x)
        x, (hn, cn) = self.lstm(x)
        x = self.fc(hn[-1])
        return x

class SpamDetector:
    def __init__(self, model_path="lstm_model.pth", word2vec_path="word2vec.model"):
        # Load Word2Vec model
        self.word2vec_model = Word2Vec.load(word2vec_path)
        self.word_vectors = self.word2vec_model.wv
        
        # Create embedding matrix
        embedding_matrix = np.zeros((len(self.word_vectors.key_to_index) + 1, 100))
        for i, word in enumerate(self.word_vectors.key_to_index):
            embedding_matrix[i + 1] = self.word_vectors[word]
        
        # Load model
        hidden_dim = 64
        output_dim = 2  # binary classification: spam or not spam
        self.model = LSTMModel(embedding_matrix, hidden_dim, output_dim).to(device)
        self.model.load_state_dict(torch.load(model_path, map_location=device))
        self.model.eval()
        
        # Set max length for consistency with training
        self.max_length = 100

    def preprocess_text(self, text):
        # Simple preprocessing: lowercase and split
        tokens = str(text).lower().split()
        # Convert tokens to indices
        sequence = [self.word_vectors.key_to_index.get(word, 0) + 1 for word in tokens 
                   if word in self.word_vectors.key_to_index]
        # Pad or truncate to max_length
        if len(sequence) < self.max_length:
            sequence = sequence + [0] * (self.max_length - len(sequence))
        else:
            sequence = sequence[:self.max_length]
        return sequence

    def predict(self, text):
        """Predict if text is spam or not"""
        # Preprocess the text
        sequence = self.preprocess_text(text)
        
        # Convert to tensor
        input_tensor = torch.tensor([sequence], dtype=torch.long).to(device)
        
        # Get prediction
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = torch.softmax(output, dim=1)
            _, predicted = torch.max(output.data, 1)
        
        # Convert to Python types for JSON serialization
        result = {
            "is_spam": bool(predicted.item()),
            "confidence": float(probabilities[0][predicted.item()].item()),
            "spam_probability": float(probabilities[0][1].item()),
            "ham_probability": float(probabilities[0][0].item())
        }
        
        return result

# Singleton instance
_detector = None

def get_detector():
    global _detector
    if _detector is None:
        _detector = SpamDetector()
    return _detector
