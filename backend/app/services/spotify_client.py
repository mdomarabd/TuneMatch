"""
Spotify API Client for playlist export
"""
import requests
from typing import List, Dict
from backend.app.config import settings

import time

class SpotifyClient:
    def __init__(self):
        self.client_id = settings.SPOTIFY_CLIENT_ID
        self.client_secret = settings.SPOTIFY_CLIENT_SECRET
        self.redirect_uri = settings.SPOTIFY_REDIRECT_URI
        self.auth_url = "https://accounts.spotify.com/authorize"
        self.token_url = "https://accounts.spotify.com/api/token"
        self.api_base = "https://api.spotify.com/v1"
    
    def get_auth_url(self, state: str) -> str:
        """Generate Spotify OAuth authorization URL"""
        scopes = "playlist-modify-public playlist-modify-private"
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": scopes,
            "state": state,
            "show_dialog": "true"
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"
    
    def exchange_code_for_token(self, code: str) -> Dict:
        """Exchange authorization code for access token"""
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        response = requests.post(self.token_url, data=data)
        response.raise_for_status()
        return response.json()
    
    def get_user_profile(self, access_token: str) -> Dict:
        """Get Spotify user profile"""
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(f"{self.api_base}/me", headers=headers)
        response.raise_for_status()
        return response.json()
    
    def create_playlist(self, access_token: str, user_id: str, name: str, description: str = "") -> Dict:
        """Create a new playlist"""
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        data = {
            "name": name,
            "description": description or f"Created by TuneMatch",
            "public": False
        }
        response = requests.post(f"{self.api_base}/users/{user_id}/playlists", headers=headers, json=data)
        if not response.ok:
            print(f"Error creating playlist: {response.text}")
        response.raise_for_status()
        return response.json()
    
    def add_tracks_to_playlist(self, access_token: str, playlist_id: str, track_uris: List[str]):
        """Add tracks to a playlist"""
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        # Spotify allows max 100 tracks per request
        for i in range(0, len(track_uris), 100):
            batch = track_uris[i:i+100]
            data = {"uris": batch}
            
            # Retry logic for 404 eventual consistency
            max_retries = 5
            for attempt in range(max_retries):
                response = requests.post(f"{self.api_base}/playlists/{playlist_id}/tracks", headers=headers, json=data)
                
                if response.status_code == 404 or response.status_code >= 500:
                    print(f"{response.status_code} error adding tracks, retrying in 2s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(2)
                    continue
                
                if not response.ok:
                    print(f"Error adding tracks: {response.text}")
                
                response.raise_for_status()
                break
    
    def export_playlist(self, access_token: str, playlist_name: str, spotify_ids: List[str]) -> Dict:
        """Export a playlist to Spotify"""
        # Get user profile
        profile = self.get_user_profile(access_token)
        user_id = profile["id"]
        
        
        # Create playlist
        playlist = self.create_playlist(access_token, user_id, playlist_name)
        print(f"Created playlist {playlist['id']}")
        
        # Wait a moment for propagation
        time.sleep(1)
        
        # Convert spotify IDs to URIs
        track_uris = [f"spotify:track:{sid}" for sid in spotify_ids if sid]
        
        # Add tracks
        if track_uris:
            self.add_tracks_to_playlist(access_token, playlist["id"], track_uris)
        
        return {
            "playlist_id": playlist["id"],
            "playlist_url": playlist["external_urls"]["spotify"],
            "tracks_added": len(track_uris)
        }
