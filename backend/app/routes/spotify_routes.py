"""
Spotify OAuth and Export Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List
import secrets
from backend.app.services.spotify_client import SpotifyClient
from backend.app.auth import verify_token
from backend.app.db import Database

router = APIRouter(tags=["Spotify"], prefix="/spotify")

# In-memory state storage (in production, use Redis or database)
oauth_states = {}

spotify_client = SpotifyClient()

class SpotifyExportRequest(BaseModel):
    playlist_id: str

@router.get("/auth/url")
def get_spotify_auth_url(user: dict = Depends(verify_token)):
    """Get Spotify OAuth URL"""
    state = secrets.token_urlsafe(16)
    oauth_states[state] = str(user["_id"])
    
    auth_url = spotify_client.get_auth_url(state)
    return {"auth_url": auth_url}

@router.get("/auth/callback")
def spotify_callback(code: str = Query(...), state: str = Query(...)):
    """Handle Spotify OAuth callback"""
    # Verify state
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    user_id = oauth_states.pop(state)
    
    try:
        # Exchange code for token
        token_data = spotify_client.exchange_code_for_token(code)
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        
        # Store token in database (associated with user)
        update_data = {"spotify_access_token": access_token}
        if refresh_token:
            update_data["spotify_refresh_token"] = refresh_token
            
        Database.db["users"].update_one(
            {"_id": Database.object_id(user_id)},
            {"$set": update_data}
        )
        
        # Redirect to frontend success page
        return RedirectResponse(url="http://localhost:5173/profile")
    except Exception as e:
        print(f"Spotify callback error: {e}")
        return RedirectResponse(url="http://localhost:5173/profile?spotify=error")

@router.post("/export")
def export_to_spotify(payload: SpotifyExportRequest, user: dict = Depends(verify_token)):
    """Export a playlist to Spotify"""
    # Get user's Spotify access token
    user_doc = Database.db["users"].find_one({"_id": user["_id"]})
    access_token = user_doc.get("spotify_access_token")
    refresh_token = user_doc.get("spotify_refresh_token")
    
    if not access_token:
        raise HTTPException(status_code=400, detail="Spotify not connected. Please authorize first.")
    
    # Get playlist
    playlist = Database.db["playlists"].find_one({"_id": Database.object_id(payload.playlist_id)})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Verify ownership
    if str(playlist["user_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Extract Spotify IDs
    spotify_ids = [song.get("spotify_id") for song in playlist["songs"] if song.get("spotify_id")]
    
    if not spotify_ids:
        raise HTTPException(status_code=400, detail="No Spotify tracks in this playlist")
    
    from requests.exceptions import HTTPError
    
    try:
        result = spotify_client.export_playlist(access_token, playlist["name"], spotify_ids)
        return {
            "success": True,
            "message": f"Exported {result['tracks_added']} tracks to Spotify",
            "spotify_url": result["playlist_url"]
        }
    except HTTPError as e:
        # Check for 401 Unauthorized
        if e.response.status_code == 401 and refresh_token:
            print("Access token expired, attempting refresh...")
            try:
                # Refresh token
                new_token_data = spotify_client.refresh_access_token(refresh_token)
                new_access_token = new_token_data["access_token"]
                
                # Update DB
                Database.db["users"].update_one(
                    {"_id": user["_id"]},
                    {"$set": {"spotify_access_token": new_access_token}}
                )
                
                # Retry export with new token
                result = spotify_client.export_playlist(new_access_token, playlist["name"], spotify_ids)
                return {
                    "success": True,
                    "message": f"Exported {result['tracks_added']} tracks to Spotify",
                    "spotify_url": result["playlist_url"]
                }
            except Exception as refresh_error:
                print(f"Token refresh failed: {refresh_error}")
                # Fall through to re-raise original or new error
                pass
        
        print(f"Export error: {e}")
        # Identify as auth error for frontend
        if e.response.status_code == 401:
             raise HTTPException(status_code=401, detail="Spotify session expired. Please reconnect.")
             
        raise HTTPException(status_code=500, detail=f"Failed to export: {str(e)}")
    except Exception as e:
        print(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export: {str(e)}")
