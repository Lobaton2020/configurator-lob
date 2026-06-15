from datetime import datetime
from app.core.db import db


class Audit(db.Model):
    __tablename__ = "audits"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), default="unknown")
    action = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    old_data = db.Column(db.JSON)
    new_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)