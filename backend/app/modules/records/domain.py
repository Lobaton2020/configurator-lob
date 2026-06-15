from datetime import datetime
from app.core.db import db


class Record(db.Model):
    __tablename__ = "records"
    
    id = db.Column(db.Integer, primary_key=True)
    schema_id = db.Column(db.Integer, db.ForeignKey("schemas.id"), nullable=False)
    data = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)