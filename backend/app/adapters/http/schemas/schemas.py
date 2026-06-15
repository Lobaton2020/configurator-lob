from flask import request, jsonify
from app.schemas import SchemaResponse, SchemaWithColumns
from app.modules.schemas.service import SchemaService
from app.core.db import db


API_PREFIX = "/api/schemas"


def register_routes(app):
    
    @app.route(f"{API_PREFIX}", methods=["GET"])
    def get_schemas():
        """Get all schemas
        ---
        tags:
          - Schemas
        responses:
          200:
            description: List of schemas
        """
        schemas = SchemaService.get_all()
        return jsonify([SchemaResponse.model_validate(s).model_dump() for s in schemas])
    
    @app.route(f"{API_PREFIX}", methods=["POST"])
    def create_schema():
        """Create a new schema
        ---
        tags:
          - Schemas
        parameters:
          - name: body
            in: body
            required: true
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
        responses:
          201:
            description: Schema created
        """
        data = request.get_json()
        schema = SchemaService.create(data.get("name"), data.get("description"))
        return jsonify(SchemaResponse.model_validate(schema).model_dump()), 201
    
    @app.route(f"{API_PREFIX}/<int:schema_id>", methods=["GET"])
    def get_schema(schema_id):
        """Get a schema by ID
        ---
        tags:
          - Schemas
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: Schema details
        """
        from app.modules.schemas.service import ColumnService
        schema = SchemaService.get_by_id(schema_id)
        if not schema:
            return jsonify({"error": "Schema not found"}), 404
        columns = ColumnService.get_by_schema(schema_id)
        result = SchemaWithColumns(
            id=schema.id,
            name=schema.name,
            description=schema.description,
            created_at=schema.created_at,
            updated_at=schema.updated_at,
            columns=[{"id": c.id, "name": c.name, "data_type": c.data_type, "is_filterable": c.is_filterable, "order": c.order, "schema_id": c.schema_id, "created_at": c.created_at} for c in columns]
        )
        return jsonify(result.model_dump())
    
    @app.route(f"{API_PREFIX}/<int:schema_id>", methods=["PUT"])
    def update_schema(schema_id):
        """Update a schema
        ---
        tags:
          - Schemas
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
                name:
                  type: string
                description:
                  type: string
        responses:
          200:
            description: Schema updated
        """
        data = request.get_json()
        schema = SchemaService.update(schema_id, data.get("name"), data.get("description"))
        if not schema:
            return jsonify({"error": "Schema not found"}), 404
        return jsonify(SchemaResponse.model_validate(schema).model_dump())
    
    @app.route(f"{API_PREFIX}/<int:schema_id>", methods=["DELETE"])
    def delete_schema(schema_id):
        """Delete a schema
        ---
        tags:
          - Schemas
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: Schema deleted
        """
        if SchemaService.delete(schema_id):
            return jsonify({"message": "Deleted"}), 200
        return jsonify({"error": "Schema not found"}), 404