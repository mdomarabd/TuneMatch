from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db import Database
from backend.app.routes import users, auth_routes, playlists, recommendations, spotify_routes
from backend.app.services.recommender import RecommenderService

app = FastAPI(title="TuneMatch API")

# Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth_routes.router)
app.include_router(playlists.router)
app.include_router(recommendations.router)
app.include_router(spotify_routes.router)

@app.on_event("startup")
async def startup_event():
    # Connect to MongoDB
    Database.connect_db()
    
    # Initialize Recommender Service (Pre-load heavy models)
    try:
        RecommenderService.get_instance()
    except Exception as e:
        print(f"Warning: Failed to load RecommenderService on startup: {e}")

    # Ensure the password reset codes collection has a TTL index
    Database.db["password_reset_codes"].create_index(
        "expires_at", expireAfterSeconds=0
    )

@app.on_event("shutdown")
async def shutdown_event():
    # Close MongoDB connection if needed
    Database.disconnect_db()