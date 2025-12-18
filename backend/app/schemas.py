# backend/app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# ---------------------
# USER SCHEMAS
# ---------------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    avatar: Optional[str] = None # Base64 encoded or URL

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    email: Optional[EmailStr] = None

class UserOut(UserBase):
    id: str
    created_at: datetime
    avatar: Optional[str] = None
    is_spotify_connected: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# ---------------------
# TOKEN SCHEMA
# ---------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ---------------------
# SONG, MOOD, PLAYLIST (simplified)
# ---------------------
class SongBase(BaseModel):
    track: str
    artist: str
    genre: Optional[str] = None
    mood_tags: Optional[List[str]] = []
    source: Optional[str] = "CSV"
    spotify_url: Optional[str] = None
    spotify_id: Optional[str] = None # Added for compatibility with Recommender

class PlaylistOut(BaseModel):
    id: str
    name: str
    user_id: str
    songs: List[SongBase] = []
    created_at: datetime

class SongOut(SongBase):
    pass

class PlaylistCreate(BaseModel):
    name: str
    songs: List[SongBase] # Now explicitly using SongBase

# ---------------------
# PASSWORD RESET SCHEMAS
# ---------------------
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class PlaylistCombineRequest(BaseModel):
    name: str
    playlist_ids: List[str]
    delete_originals: bool = False

class PlaylistRenameRequest(BaseModel):
    name: str

# ---------------------
# RECOMMENDATION SCHEMAS
# ---------------------
class RecommendationRequest(BaseModel):
    text: str
    top_n: Optional[int] = 10  # Default 10 songs, range 5-50
