import pandas as pd
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer, util
import os

class RecommenderService:
    _instance = None
    
    def __init__(self):
        # Paths - assuming running from root or adjusting relative paths
        self.BASE_DIR = Path(__file__).resolve().parents[3] # up to TuneMatch
        self.DATASET_PATH = self.BASE_DIR / "data" / "muse_v3_filtered.csv"
        self.EMBEDDINGS_CACHE = self.BASE_DIR / "song_embeddings.npy"
        self.MODEL_NAME = "all-MiniLM-L6-v2"
        self.NUM_MOODS = 2
        
        self.model = None
        self.song_embeddings = None
        self.df = None
        self.mood_embeddings = None
        self.mood_labels = []
        
        self.REFERENCE_MOODS = {
            "happy": "feeling joyful, excited, positive and full of energy",
            "sad": "feeling down, low mood, heart heavy, emotional pain",
            "angry": "feeling irritated, mad, frustrated, aggressive",
            "calm": "feeling peaceful, relaxed, serene, tranquil",
            "energetic": "feeling powerful, active, hyped, full of motivation",
            "romantic": "feeling loving, soft, emotional, dreamy",
            "anxious": "feeling stressed, nervous, overwhelmed",
        }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load_resources()
        return cls._instance

    def load_resources(self):
        print("Loading Recommender Service...")
        
        # Load Dataset
        if not self.DATASET_PATH.exists():
            raise FileNotFoundError(f"Dataset not found at {self.DATASET_PATH}")
        
        self.df = pd.read_csv(str(self.DATASET_PATH))
        
        # Helper to combine metadata if needed (assuming dataset might need it recreated or it's just for reference)
        # In the original script, it computed embeddings based on this. 
        # Since we use cached embeddings, we assume they match the dataframe index.
        
        # Load Model
        print("Loading sentence-transformer model...")
        self.model = SentenceTransformer(self.MODEL_NAME)
        
        # Load Embeddings
        if self.EMBEDDINGS_CACHE.exists():
            print("Loading cached embeddings...")
            self.song_embeddings = np.load(str(self.EMBEDDINGS_CACHE))
        else:
            print("Computing embeddings references (This might take a while)...")
            # Logic to recompute if missing (copied from original)
            def combine_metadata(row):
                seeds = " ".join(row["seeds"].strip("[]").replace("'", "").split(","))
                return f"{row['track']} by {row['artist']} genre {row['genre']} mood {seeds}"
            
            self.df["description"] = self.df.apply(combine_metadata, axis=1)
            self.song_embeddings = self.model.encode(self.df["description"].tolist(), batch_size=128, show_progress_bar=True)
            np.save(str(self.EMBEDDINGS_CACHE), self.song_embeddings)
            
        # Pre-compute mood embeddings
        self.mood_labels = list(self.REFERENCE_MOODS.keys())
        mood_texts = list(self.REFERENCE_MOODS.values())
        self.mood_embeddings = self.model.encode(mood_texts)
        
        print("Recommender Service Ready")

    def detect_moods(self, user_text, threshold=0.20):
        user_emb = self.model.encode(user_text)
        scores = util.cos_sim(user_emb, self.mood_embeddings)[0].cpu().numpy()
        
        detected = []
        for i, score in enumerate(scores):
            if score >= threshold:
                detected.append((self.mood_labels[i], float(score)))
                
        if not detected:
            top_ids = scores.argsort()[::-1][:3]
            detected = [(self.mood_labels[i], float(scores[i])) for i in top_ids]
            
        detected.sort(key=lambda x: x[1], reverse=True)
        return detected, user_emb

    def recommend(self, user_text, top_n=10):
        moods, user_emb = self.detect_moods(user_text)
        
        scores = util.cos_sim(user_emb, self.song_embeddings)[0].cpu().numpy()
        top_ids = scores.argsort()[::-1][:top_n]
        
        rec_df = self.df.iloc[top_ids][["track", "artist", "genre", "spotify_id"]].copy()
        rec_df["spotify_url"] = rec_df["spotify_id"].apply(lambda x: f"https://open.spotify.com/track/{x}" if pd.notna(x) else None)
        
        # Sanitize results: Replace NaN with None for Pydantic compatibility
        rec_df = rec_df.replace({np.nan: None})
        
        # Convert to list of dicts
        recommendations = rec_df.to_dict(orient="records")
        
        return {
            "moods": [m[0] for m in moods],
            "recommendations": recommendations
        }
