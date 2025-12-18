# backend/app/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from backend.app.schemas import UserCreate, UserOut, UserUpdate, PasswordChangeRequest
from backend.app.db import Database
from backend.app.auth import hash_password, verify_token, verify_password

router = APIRouter(tags=["Users"], prefix="/users")

# --- HELPERS ---
def get_user_by_id(user_id: str):
    user_doc = Database.db["users"].find_one({"_id": Database.object_id(user_id)})
    return user_doc

# --- GET CURRENT USER ---
@router.get("/me", response_model=UserOut)
def get_me(user: dict = Depends(verify_token)):
    user_doc = get_user_by_id(str(user["_id"]))
    if not user_doc:
         raise HTTPException(status_code=404, detail="User not found")
    
    return UserOut(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        avatar=user_doc.get("avatar"),
        created_at=user_doc.get("created_at"),
        is_spotify_connected=bool(user_doc.get("spotify_access_token"))
    )

# --- UPDATE CURRENT USER ---
@router.put("/me", response_model=UserOut)
def update_me(update_data: UserUpdate, user: dict = Depends(verify_token)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if not update_dict:
        return get_me(user)

    Database.db["users"].update_one(
        {"_id": Database.object_id(str(user["_id"]))},
        {"$set": update_dict}
    )
    
    # Return updated user
    return get_me(user)

# --- GET USER BY ID ---
@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    user_doc = get_user_by_id(user_id)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        created_at=user_doc.get("created_at"),
        playlists=user_doc.get("playlists", [])
    )

# --- CREATE USER ---
@router.post("/", response_model=UserOut)
def create_user(user: UserCreate):
    if Database.db["users"].find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = hash_password(user.password)
    user_dict = {
        "email": user.email,
        "full_name": user.full_name,
        "password": hashed_pw,
        "created_at": datetime.utcnow(),
        "playlists": []
    }
    result = Database.db["users"].insert_one(user_dict)
    return UserOut(
        id=str(result.inserted_id),
        email=user_dict["email"],
        full_name=user_dict.get("full_name"),
        created_at=user_dict["created_at"]
    )

# --- CHANGE PASSWORD ---
@router.put("/me/password")
def change_password(payload: PasswordChangeRequest, user: dict = Depends(verify_token)):
    user_doc = get_user_by_id(str(user["_id"]))
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(payload.current_password, user_doc["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_hashed_password = hash_password(payload.new_password)
    
    # Update password
    Database.db["users"].update_one(
        {"_id": Database.object_id(str(user["_id"]))},
        {"$set": {"password": new_hashed_password}}
    )
    
    return {"message": "Password updated successfully"}
