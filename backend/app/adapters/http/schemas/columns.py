from flask import request, jsonify
from app.schemas import ColumnResponse
from app.modules.schemas.service import ColumnService
from app.core.db import db


API_PREFIX = "/api/schemas"


def register_routes(app):
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/columns", methods=["GET"])
    def get_columns(schema_id):
        """Get all columns for a schema
        ---
        tags:
          - Columns
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: List of columns
        """
        columns = ColumnService.get_by_schema(schema_id)
        return jsonify([ColumnResponse.model_validate(c).model_dump() for c in columns])
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/columns", methods=["POST"])
    def create_column(schema_id):
        """Create a new column
        ---
        tags:
          - Columns
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
                data_type:
                  type: string
                is_filterable:
                  type: boolean
                order:
                  type: integer
        responses:
          201:
            description: Column created
        """
        data = request.get_json()
        column = ColumnService.create(
            schema_id,
            data.get("name"),
            data.get("data_type"),
            data.get("is_filterable", True),
            data.get("order", 0)
        )
        if not column:
            return jsonify({"error": "Schema not found"}), 404
        return jsonify(ColumnResponse.model_validate(column).model_dump()), 201
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/columns/<int:column_id>", methods=["GET"])
    def get_column(schema_id, column_id):
        """Get a column by ID
        ---
        tags:
          - Columns
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: column_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: Column details
        """
        column = ColumnService.get_by_id(column_id)
        if not column:
            return jsonify({"error": "Column not found"}), 404
        return jsonify(ColumnResponse.model_validate(column).model_dump())
    
    @app.route(f"{API_PREFIX}/<int:schema_id>/columns/<int:column_id>", methods=["DELETE"])
    def delete_column(schema_id, column_id):
        """Delete a column
        ---
        tags:
          - Columns
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: column_id
            in: path
            required: true
            type: integer
        responses:
          200:
            description: Column deleted
        """
        if ColumnService.delete(column_id):
            return jsonify({"message": "Deleted"}), 200
        return jsonify({"error": "Column not found"}), 404

    @app.route(f"{API_PREFIX}/<int:schema_id>/columns/<int:column_id>", methods=["PUT"])
    def update_column(schema_id, column_id):
        """Update a column
        ---
        tags:
          - Columns
        parameters:
          - name: schema_id
            in: path
            required: true
            type: integer
          - name: column_id
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
                data_type:
                  type: string
                is_filterable:
                  type: boolean
                order:
                  type: integer
        responses:
          200:
            description: Column updated
        """
        data = request.get_json()
        column = ColumnService.update(
            column_id,
            data.get("name"),
            data.get("data_type"),
            data.get("is_filterable"),
            data.get("order")
        )
        if not column:
            return jsonify({"error": "Column not found"}), 404
        return jsonify(ColumnResponse.model_validate(column).model_dump())