import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
API_PREFIX = "/api"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    API_PREFIX = API_PREFIX
    
    DB_TYPE = os.environ.get("DB_TYPE", "sqlite")
    
    if DB_TYPE == "mysql":
        MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
        MYSQL_PORT = int(os.environ.get("MYSQL_PORT", 3306))
        MYSQL_USER = os.environ.get("MYSQL_USER", "root")
        MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "")
        MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "configurator")
        
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
            f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
        )
    else:
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{BASE_DIR}/configurator.db"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False