# backend/app/routes/auth_routes.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import timedelta, datetime
from backend.app.schemas import UserLogin, Token, PasswordResetRequest, PasswordResetConfirm
from backend.app.db import Database
from backend.app.auth import verify_password, create_access_token, hash_password
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["Auth"], prefix="/auth")

def send_reset_email(to_email: str, code: str):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_sender = os.getenv("SMTP_SENDER")

    if not all([smtp_server, smtp_user, smtp_password]):
        print(f"Warning: Email credentials missing. Code for {to_email}: {code}")
        return

    msg = MIMEMultipart()
    msg['From'] = smtp_sender
    msg['To'] = to_email
    msg['Subject'] = "TuneMatch Password Reset Code"

    body = f"Your password reset code is: {code}\n\nThis code expires in 15 minutes."
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_sender, to_email, msg.as_string())
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        # Fallback to log for debugging if email fails
        print(f"DEBUG CODE for {to_email}: {code}")

@router.post("/login", response_model=Token)
def login(user: UserLogin):
    user_doc = Database.db["users"].find_one({"email": user.email})
    if not user_doc or not verify_password(user.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(
        data={"sub": str(user_doc["_id"])},
        expires_delta=timedelta(minutes=60)
    )
    return Token(access_token=access_token)

@router.post("/forgot-password")
async def forgot_password(payload: PasswordResetRequest, background_tasks: BackgroundTasks):
    user = Database.db["users"].find_one({"email": payload.email})
    if not user:
        # Don't reveal if user exists
        return {"message": "If this email is registered, you will receive a code."}
    
    # Generate 6-digit code
    code = str(secrets.randbelow(1000000)).zfill(6)
    
    # Save to DB with TTL
    Database.db["password_reset_codes"].insert_one({
        "email": payload.email,
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=15)
    })
    
    # Send email in background
    background_tasks.add_task(send_reset_email, payload.email, code)
    
    return {"message": "If this email is registered, you will receive a code."}

@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm):
    # Find valid code
    reset_doc = Database.db["password_reset_codes"].find_one({
        "email": payload.email,
        "code": payload.code
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    # Check expiry manually just in case TTL hasn't kicked in
    if reset_doc["expires_at"] < datetime.utcnow():
         raise HTTPException(status_code=400, detail="Code expired")

    # Hash new password
    hashed_pw = hash_password(payload.new_password)
    
    # Update user
    Database.db["users"].update_one(
        {"email": payload.email},
        {"$set": {"password": hashed_pw}}
    )
    
    # Delete used code
    Database.db["password_reset_codes"].delete_one({"_id": reset_doc["_id"]})
    
    return {"message": "Password updated successfully"}
