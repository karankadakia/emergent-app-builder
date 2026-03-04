from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db = None


db_instance = Database()


async def connect_to_mongo():
    """Connect to MongoDB"""
    try:
        db_instance.client = AsyncIOMotorClient(settings.mongo_url)
        db_instance.db = db_instance.client[settings.db_name]
        logger.info(f"Connected to MongoDB at {settings.mongo_url}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db_instance.client:
        db_instance.client.close()
        logger.info("Closed MongoDB connection")


def get_database():
    """Get database instance"""
    return db_instance.db
