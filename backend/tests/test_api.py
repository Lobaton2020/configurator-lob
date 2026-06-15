import pytest
from app import create_app
from app.core.db import db
from app.modules.schemas.domain import Schema, Column
from app.modules.records.domain import Record
from app.modules.audits.domain import Audit


@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


class TestSchemas:
    def test_create_schema(self, client):
        response = client.post("/api/schemas", json={
            "name": "test-schema",
            "description": "test desc"
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "test-schema"
    
    def test_get_schemas(self, client):
        client.post("/api/schemas", json={"name": "schema1"})
        client.post("/api/schemas", json={"name": "schema2"})
        
        response = client.get("/api/schemas")
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 2
    
    def test_get_schema_by_id(self, client):
        create_resp = client.post("/api/schemas", json={"name": "single"})
        schema_id = create_resp.get_json()["id"]
        
        response = client.get(f"/api/schemas/{schema_id}")
        assert response.status_code == 200
        assert response.get_json()["name"] == "single"
    
    def test_update_schema(self, client):
        create_resp = client.post("/api/schemas", json={"name": "to-update"})
        schema_id = create_resp.get_json()["id"]
        
        response = client.put(f"/api/schemas/{schema_id}", json={
            "name": "updated-name",
            "description": "new desc"
        })
        assert response.status_code == 200
        assert response.get_json()["name"] == "updated-name"
    
    def test_delete_schema(self, client):
        create_resp = client.post("/api/schemas", json={"name": "to-delete"})
        schema_id = create_resp.get_json()["id"]
        
        response = client.delete(f"/api/schemas/{schema_id}")
        assert response.status_code == 200
        
        get_resp = client.get(f"/api/schemas/{schema_id}")
        assert get_resp.status_code == 404


class TestColumns:
    def test_create_column(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-for-col"})
        schema_id = schema.get_json()["id"]
        
        response = client.post(f"/api/schemas/{schema_id}/columns", json={
            "name": "name",
            "data_type": "string"
        })
        assert response.status_code == 201
        assert response.get_json()["name"] == "name"
    
    def test_get_columns(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-cols"})
        schema_id = schema.get_json()["id"]
        
        client.post(f"/api/schemas/{schema_id}/columns", json={"name": "col1", "data_type": "string"})
        client.post(f"/api/schemas/{schema_id}/columns", json={"name": "col2", "data_type": "number"})
        
        response = client.get(f"/api/schemas/{schema_id}/columns")
        assert response.status_code == 200
        assert len(response.get_json()) == 2
    
    def test_delete_column(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-del-col"})
        schema_id = schema.get_json()["id"]
        
        col = client.post(f"/api/schemas/{schema_id}/columns", json={
            "name": "to-delete",
            "data_type": "string"
        })
        col_id = col.get_json()["id"]
        
        response = client.delete(f"/api/schemas/{schema_id}/columns/{col_id}")
        assert response.status_code == 200


class TestRecords:
    def test_create_record(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-rec"})
        schema_id = schema.get_json()["id"]
        
        client.post(f"/api/schemas/{schema_id}/columns", json={
            "name": "title",
            "data_type": "string"
        })
        
        response = client.post(f"/api/schemas/{schema_id}/records", json={
            "data": {"title": "Hello World"}
        })
        assert response.status_code == 201
    
    def test_get_records(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-recs"})
        schema_id = schema.get_json()["id"]
        
        client.post(f"/api/schemas/{schema_id}/columns", json={
            "name": "field",
            "data_type": "string"
        })
        client.post(f"/api/schemas/{schema_id}/records", json={"data": {"field": "val1"}})
        client.post(f"/api/schemas/{schema_id}/records", json={"data": {"field": "val2"}})
        
        response = client.get(f"/api/schemas/{schema_id}/records")
        assert response.status_code == 200
        assert response.get_json()["total"] == 2
    
    def test_update_record(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-upd-rec"})
        schema_id = schema.get_json()["id"]
        
        client.post(f"/api/schemas/{schema_id}/columns", json={
            "name": "field",
            "data_type": "string"
        })
        
        rec = client.post(f"/api/schemas/{schema_id}/records", json={"data": {"field": "old"}})
        rec_id = rec.get_json()["id"]
        
        response = client.put(f"/api/schemas/{schema_id}/records/{rec_id}", json={
            "data": {"field": "new"}
        })
        assert response.status_code == 200
        assert response.get_json()["data"]["field"] == "new"
    
    def test_delete_record(self, client):
        schema = client.post("/api/schemas", json={"name": "schema-del-rec"})
        schema_id = schema.get_json()["id"]
        
        client.post(f"/api/schemas/{schema_id}/columns", json={
            "name": "field",
            "data_type": "string"
        })
        
        rec = client.post(f"/api/schemas/{schema_id}/records", json={"data": {"field": "x"}})
        rec_id = rec.get_json()["id"]
        
        response = client.delete(f"/api/schemas/{schema_id}/records/{rec_id}")
        assert response.status_code == 200


class TestAudits:
    def test_audit_created_on_schema_create(self, client):
        client.post("/api/schemas", json={"name": "audit-test"})
        
        response = client.get("/api/audits")
        assert response.status_code == 200
        audits = response.get_json()["items"]
        
        schema_audit = [a for a in audits if a["entity_type"] == "schema"][-1]
        assert schema_audit["action"] == "create"
    
    def test_audit_created_on_update(self, client):
        create = client.post("/api/schemas", json={"name": "old-name"})
        schema_id = create.get_json()["id"]
        
        client.put(f"/api/schemas/{schema_id}", json={"name": "new-name"})
        
        response = client.get("/api/audits")
        audits = response.get_json()["items"]
        
        update_audit = [a for a in audits if a["action"] == "update"][-1]
        assert update_audit["old_data"]["name"] == "old-name"
        assert update_audit["new_data"]["name"] == "new-name"
    
    def test_audit_created_on_delete(self, client):
        create = client.post("/api/schemas", json={"name": "to-delete-audit"})
        schema_id = create.get_json()["id"]
        
        client.delete(f"/api/schemas/{schema_id}")
        
        response = client.get("/api/audits")
        audits = response.get_json()["items"]
        
        delete_audit = [a for a in audits if a["action"] == "delete"][-1]
        assert delete_audit["entity_type"] == "schema"
    
    def test_audit_by_entity(self, client):
        create = client.post("/api/schemas", json={"name": "entity-audit"})
        schema_id = create.get_json()["id"]
        
        response = client.get(f"/api/audits/schema/{schema_id}")
        assert response.status_code == 200
        assert len(response.get_json()) >= 1


class TestStats:
    def test_get_global_stats(self, client):
        response = client.get("/api/stats")
        assert response.status_code == 200
        data = response.get_json()
        
        assert "total_schemas" in data
        assert "total_columns" in data
        assert "total_records" in data
        assert "schemas" in data