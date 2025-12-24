from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "equity_trust_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def get_db():
    return db
