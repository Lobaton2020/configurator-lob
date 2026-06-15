from flask import jsonify
from app.modules.stats.service import StatsService


API_PREFIX = "/api"


def register_routes(app):
    
    @app.route(f"{API_PREFIX}/stats", methods=["GET"])
    def get_stats():
        """Get global statistics
        ---
        tags:
          - Stats
        responses:
          200:
            description: Global statistics
        """
        stats = StatsService.get_global()
        return jsonify(stats)