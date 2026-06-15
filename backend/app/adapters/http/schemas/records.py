from flask import request, jsonify
from app.schemas import RecordResponse
from app.modules.records.service import RecordService
from app.core.db import db


API_PREFIX = "/api/schemas"


def register_routes(app):
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/records", methods=["GET"])
    def get_records(schema_id):
        """Get all records for a schema
        ---
        tags:
          - Records
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: page
            in: query
            type: integer
            default: 1
          - name: limit
            in: query
            type: integer
            default: 20
        responses:
          200:
            description: List of records
        """
        page = request.args.get("page", 1, type=int)
        limit = request.args.get("limit", 20, type=int)
        result = RecordService.get_by_schema(schema_id, page, limit)
        return jsonify({
            "items": [RecordResponse.model_validate(r).model_dump() for r in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "limit": result["limit"],
            "pages": result["pages"]
        })
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/records", methods=["POST"])
    def create_record(schema_id):
        """Create a new record
        ---
        tags:
          - Records
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: body
            in: body
            schema:
              type: object
              properties:
                data:
                  type: object
        responses:
          201:
            description: Record created
        """
        data = request.get_json()
        record, msg = RecordService.create(schema_id, data.get("data"))
        if not record:
            return jsonify({"error": msg}), 400
        return jsonify(RecordResponse.model_validate(record).model_dump()), 201
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/records/<int:record_id>", methods=["GET"])
    def get_record(schema_id, record_id):
        """Get a record by ID
        ---
        tags:
          - Records
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: record_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: Record details
        """
        record = RecordService.get_by_id(record_id)
        if not record:
            return jsonify({"error": "Record not found"}), 404
        return jsonify(RecordResponse.model_validate(record).model_dump())
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/records/<int:record_id>", methods=["PUT"])
    def update_record(schema_id, record_id):
        """Update a record
        ---
        tags:
          - Records
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: record_id
            in: path
            required: true
            type: integer
          - name: body
            in: body
            schema:
              type: object
              properties:
                data:
                  type: object
        responses:
          200:
            description: Record updated
        """
        data = request.get_json()
        record, msg = RecordService.update(record_id, data.get("data"))
        if not record:
            return jsonify({"error": msg}), 404
        return jsonify(RecordResponse.model_validate(record).model_dump())
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/records/<int:record_id>", methods=["DELETE"])
    def delete_record(schema_id, record_id):
        """Delete a record
        ---
        tags:
          - Records
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: record_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: Record deleted
        """
        if RecordService.delete(record_id):
            return jsonify({"message": "Deleted"}), 200
        return jsonify({"error": "Record not found"}), 404
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/records/search", methods=["POST"])
    def search_records(schema_id):
        """Search records by filters
        ---
        tags:
          - Records
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: body
            in: body
            schema:
              type: object
              properties:
                filters:
                  type: object
                page:
                  type: integer
                limit:
                  type: integer
        responses:
          200:
            description: Search results
        """
        data = request.get_json() or {}
        filters = data.get("filters", {})
        page = data.get("page", 1)
        limit = data.get("limit", 20)
        
        result = RecordService.search(schema_id, filters, page, limit)
        return jsonify({
            "items": [RecordResponse.model_validate(r).model_dump() for r in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "limit": result["limit"],
            "pages": result["pages"]
        })