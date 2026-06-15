from flask import Flask
from flask_cors import CORS
from flasgger import Swagger

from config import Config
from app.core.db import db

SWAGGER_TEMPLATE = {
    "info": {
        "title": "Configurator API",
        "description": "API for managing schemas, columns and records",
        "version": "1.0.0"
    },
    "basePath": "/",
    "schemes": ["http"]
}


def create_app(config_class=Config):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app)
    
    db.init_app(app)
    
    from app.modules.schemas.domain import Schema, Column
    from app.modules.records.domain import Record
    from app.modules.audits.domain import Audit
    
    with app.app_context():
        db.create_all()
        _seed_data()
    
    swag = Swagger(app, template=SWAGGER_TEMPLATE)
    
    from app.adapters.http.schemas.schemas import register_routes as register_schemas
    from app.adapters.http.schemas.columns import register_routes as register_columns
    from app.adapters.http.schemas.records import register_routes as register_records
    from app.adapters.http.stats import register_routes as register_stats
    from app.adapters.http.audits import register_routes as register_audits
    
    register_schemas(app)
    register_columns(app)
    register_records(app)
    register_stats(app)
    register_audits(app)
    
    return app


def _seed_data():
    from app.modules.schemas.domain import Schema, Column
    from app.modules.records.domain import Record
    
    if Schema.query.first():
        return
    
    s1 = Schema(name="app-settings", description="Configuraciones generales de la app")
    s2 = Schema(name="feature-flags", description="Feature flags para features on/off")
    
    db.session.add(s1)
    db.session.add(s2)
    db.session.commit()
    
    cols1 = [
        Column(schema_id=s1.id, name="Key", data_type="string", is_filterable=True, order=0),
        Column(schema_id=s1.id, name="Value", data_type="json", is_filterable=False, order=1),
        Column(schema_id=s1.id, name="Environment", data_type="string", is_filterable=True, order=2),
    ]
    
    cols2 = [
        Column(schema_id=s2.id, name="FeatureName", data_type="string", is_filterable=True, order=0),
        Column(schema_id=s2.id, name="Enabled", data_type="boolean", is_filterable=True, order=1),
        Column(schema_id=s2.id, name="Value", data_type="json", is_filterable=False, order=2),
    ]
    
    for c in cols1 + cols2:
        db.session.add(c)
    db.session.commit()
    
    records1 = [
        Record(schema_id=s1.id, data={"Key": "theme", "Value": {"mode": "dark"}, "Environment": "production"}),
        Record(schema_id=s1.id, data={"Key": "api_url", "Value": {"url": "https://api.example.com"}, "Environment": "production"}),
        Record(schema_id=s1.id, data={"Key": "max_retries", "Value": {"retries": 3}, "Environment": "development"}),
    ]
    
    records2 = [
        Record(schema_id=s2.id, data={"FeatureName": "new-dashboard", "Enabled": True, "Value": {"rollout": 100}}),
        Record(schema_id=s2.id, data={"FeatureName": "beta-features", "Enabled": False, "Value": {}}),
        Record(schema_id=s2.id, data={"FeatureName": "dark-mode", "Enabled": True, "Value": {"users": ["all"]}}),
    ]
    
    for r in records1 + records2:
        db.session.add(r)
    db.session.commit()