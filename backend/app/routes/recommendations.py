from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.app.services.recommender import RecommenderService
from backend.app.schemas import RecommendationRequest

router = APIRouter(tags=["Recommendations"], prefix="/recommendations")

class SongResponse(BaseModel):
    track: str
    artist: str
    genre: Optional[str]
    spotify_id: Optional[str]
    spotify_url: Optional[str]

class RecommendationResponse(BaseModel):
    moods: List[str]
    recommendations: List[SongResponse]

def get_recommender():
    return RecommenderService.get_instance()

@router.post("/", response_model=RecommendationResponse)
def get_recommendations(payload: RecommendationRequest, service: RecommenderService = Depends(get_recommender)):
    try:
        # Validate top_n range
        top_n = max(5, min(50, payload.top_n))  # Clamp between 5 and 50
        result = service.recommend(payload.text, top_n=top_n)
        return result
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
