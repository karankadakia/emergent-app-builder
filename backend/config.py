from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application configuration with Azure placeholders"""
    
    # MongoDB
    mongo_url: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name: str = os.environ.get('DB_NAME', 'test_database')
    
    # JWT Settings
    jwt_secret_key: str = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    jwt_algorithm: str = 'HS256'
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    # Azure Data Lake Storage Gen2 (Placeholders)
    azure_storage_account_name: Optional[str] = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME', None)
    azure_storage_account_key: Optional[str] = os.environ.get('AZURE_STORAGE_ACCOUNT_KEY', None)
    azure_storage_container: str = os.environ.get('AZURE_STORAGE_CONTAINER', 'unstructured-files')
    
    # Azure Synapse Analytics (Placeholders)
    synapse_server: Optional[str] = os.environ.get('SYNAPSE_SERVER', None)
    synapse_database: Optional[str] = os.environ.get('SYNAPSE_DATABASE', None)
    synapse_username: Optional[str] = os.environ.get('SYNAPSE_USERNAME', None)
    synapse_password: Optional[str] = os.environ.get('SYNAPSE_PASSWORD', None)
    synapse_driver: str = 'ODBC Driver 18 for SQL Server'
    
    # Email Settings (SendGrid)
    sendgrid_api_key: Optional[str] = os.environ.get('SENDGRID_API_KEY', None)
    sender_email: str = os.environ.get('SENDER_EMAIL', 'noreply@azuredatatransformer.com')
    
    # CORS
    cors_origins: str = os.environ.get('CORS_ORIGINS', '*')
    
    class Config:
        env_file = '.env'
        case_sensitive = False


settings = Settings()
