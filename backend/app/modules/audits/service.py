from app.core.db import db
from app.modules.audits.domain import Audit


class AuditService:
    @staticmethod
    def log(action: str, entity_type: str, entity_id: int, new_data: dict = None, old_data: dict = None, user_id: str = "unknown"):
        audit = Audit(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_data=old_data,
            new_data=new_data
        )
        db.session.add(audit)
        db.session.commit()
        return audit

    @staticmethod
    def get_all(page: int = 1, limit: int = 50) -> dict:
        query = Audit.query.order_by(Audit.created_at.desc())
        total = query.count()
        pages = (total + limit - 1) // limit
        items = query.offset((page - 1) * limit).limit(limit).all()
        
        return {
            "items": [{
                "id": a.id,
                "user_id": a.user_id,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "old_data": a.old_data,
                "new_data": a.new_data,
                "created_at": a.created_at.isoformat() if a.created_at else None
            } for a in items],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages
        }

    @staticmethod
    def get_by_entity(entity_type: str, entity_id: int) -> list:
        return Audit.query.filter_by(entity_type=entity_type, entity_id=entity_id).order_by(Audit.created_at.desc()).all()