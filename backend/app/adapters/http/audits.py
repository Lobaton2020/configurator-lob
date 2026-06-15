from flask import request, jsonify
from app.modules.audits.service import AuditService


API_PREFIX = "/api"


def register_routes(app):
    
    @app.route(f"{API_PREFIX}/audits", methods=["GET"])
    def get_audits():
        """Get all audits
        ---
        tags:
          - Audits
        parameters:
          - name: page
            in: query
            type: integer
            default: 1
          - name: limit
            in: query
            type: integer
            default: 50
        responses:
          200:
            description: List of audits
        """
        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 50, type=int)
        result = AuditService.get_all(page, limit)
        return jsonify(result)
    
    @app.route(f"{API_PREFIX}/audits/<entity_type>/<int:entity_id>", methods=["GET"])
    def get_audits_by_entity(entity_type, entity_id):
        """Get audits by entity
        ---
        tags:
          - Audits
        parameters:
          - name: entity_type
            in: path
            required: true
            type: string
          - name: entity_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: List of audits for entity
        """
        audits = AuditService.get_by_entity(entity_type, entity_id)
        return jsonify([{
            "id": a.id,
            "user_id": a.user_id,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "old_data": a.old_data,
            "new_data": a.new_data,
            "created_at": a.created_at.isoformat() if a.created_at else None
        } for a in audits])