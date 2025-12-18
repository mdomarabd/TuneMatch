from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from backend.app.schemas import PlaylistCreate, PlaylistOut, SongOut, PlaylistCombineRequest, PlaylistRenameRequest
from backend.app.db import Database
from backend.app.auth import verify_token

router = APIRouter(tags=["Playlists"], prefix="/playlists")

# ------------------------
# CREATE PLAYLIST
# ------------------------
@router.post("/", response_model=PlaylistOut)
def create_playlist(payload: PlaylistCreate, token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    playlist_dict = {
        "name": payload.name,
        "user_id": str(user["_id"]),
        "songs": [song.dict() for song in payload.songs],  # Convert list of SongBase to list of dicts
        "created_at": datetime.utcnow()
    }
    result = Database.db["playlists"].insert_one(playlist_dict)
    return PlaylistOut(
        id=str(result.inserted_id),
        name=playlist_dict["name"],
        user_id=playlist_dict["user_id"],
        created_at=playlist_dict["created_at"],
        songs=[SongOut(**song) for song in playlist_dict["songs"]]
    )

# ------------------------
# GET ALL USER PLAYLISTS
# ------------------------
@router.get("/", response_model=List[PlaylistOut])
def get_user_playlists(token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    playlists = list(Database.db["playlists"].find({"user_id": str(user["_id"])}))
    result = []
    for pl in playlists:
        result.append(
            PlaylistOut(
                id=str(pl["_id"]),
                name=pl["name"],
                user_id=pl["user_id"],
                created_at=pl["created_at"],
                songs=[SongOut(**song) for song in pl["songs"]]
            )
        )
    return result

# ------------------------
# GET PLAYLIST BY ID
# ------------------------
@router.get("/{playlist_id}", response_model=PlaylistOut)
def get_playlist_by_id(playlist_id: str, token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    pl = Database.db["playlists"].find_one({"_id": Database.object_id(playlist_id), "user_id": str(user["_id"])})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    return PlaylistOut(
        id=str(pl["_id"]),
        name=pl["name"],
        user_id=pl["user_id"],
        created_at=pl["created_at"],
        songs=[SongOut(**song) for song in pl["songs"]]
    )

# ------------------------
# DELETE PLAYLIST
# ------------------------
@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: str, token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    result = Database.db["playlists"].delete_one({
        "_id": Database.object_id(playlist_id),
        "user_id": str(user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
        
    return {"message": "Playlist deleted"}

# ------------------------
# COMBINE PLAYLISTS
# ------------------------
@router.post("/combine", response_model=PlaylistOut)
def combine_playlists(payload: PlaylistCombineRequest, token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # Fetch all requested playlists belonging to user
    oids = [Database.object_id(pid) for pid in payload.playlist_ids]
    playlists = list(Database.db["playlists"].find({
        "_id": {"$in": oids},
        "user_id": str(user["_id"])
    }))
    
    if len(playlists) != len(payload.playlist_ids):
        raise HTTPException(status_code=404, detail="One or more playlists not found")
        
    # Merge songs, avoiding duplicates based on track+artist
    combined_songs = []
    seen = set()
    
    for pl in playlists:
        for song in pl["songs"]:
            # Create a unique key. If spotify_id exists, use it, else track+artist
            key = song.get("spotify_id") or f"{song['track']}:{song['artist']}"
            if key not in seen:
                seen.add(key)
                combined_songs.append(song)
    
    # Save new playlist
    new_playlist = {
        "name": payload.name,
        "user_id": str(user["_id"]),
        "songs": combined_songs,
        "created_at": datetime.utcnow()
    }
    
    result = Database.db["playlists"].insert_one(new_playlist)
    
    # Optional: Delete original playlists
    if payload.delete_originals:
        Database.db["playlists"].delete_many({
            "_id": {"$in": oids},
            "user_id": str(user["_id"])
        })
    
    
    return PlaylistOut(
        id=str(result.inserted_id),
        name=new_playlist["name"],
        user_id=new_playlist["user_id"],
        created_at=new_playlist["created_at"],
        songs=[SongOut(**song) for song in new_playlist["songs"]]
    )

# ------------------------
# RENAME PLAYLIST
# ------------------------
@router.patch("/{playlist_id}/rename", response_model=PlaylistOut)
def rename_playlist(playlist_id: str, payload: PlaylistRenameRequest, token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Find playlist
    playlist = Database.db["playlists"].find_one({"_id": Database.object_id(playlist_id)})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Verify ownership
    if str(playlist["user_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to rename this playlist")
    
    # Update name
    Database.db["playlists"].update_one(
        {"_id": Database.object_id(playlist_id)},
        {"$set": {"name": payload.name}}
    )
    
    # Return updated playlist
    playlist["name"] = payload.name
    return PlaylistOut(
        id=str(playlist["_id"]),
        name=playlist["name"],
        user_id=str(playlist["user_id"]),
        created_at=playlist["created_at"],
        songs=[SongOut(**song) for song in playlist.get("songs", [])]
    )

# ------------------------
# REMOVE SONG FROM PLAYLIST
# ------------------------
@router.delete("/{playlist_id}/songs/{song_index}")
def remove_song_from_playlist(playlist_id: str, song_index: int, token: str = Depends(verify_token)):
    user = token
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Find playlist
    playlist = Database.db["playlists"].find_one({"_id": Database.object_id(playlist_id)})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Verify ownership
    if str(playlist["user_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    songs = playlist.get("songs", [])
    if song_index < 0 or song_index >= len(songs):
        raise HTTPException(status_code=400, detail="Song index out of range")
    
    # Remove song
    removed_song = songs.pop(song_index)
    
    # Update DB
    Database.db["playlists"].update_one(
        {"_id": Database.object_id(playlist_id)},
        {"$set": {"songs": songs}}
    )
    
    return {"message": "Song removed", "removed_song": removed_song}
