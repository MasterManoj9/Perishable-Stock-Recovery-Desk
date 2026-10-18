"""
Integration Tests for FastAPI Predict Service
FYND Predict - AI Demand Intelligence
"""

import unittest
from fastapi.testclient import TestClient
from services.predictor.main import app


class TestPredictAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/forecast/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ready")
        self.assertIn("models_count", data)

    def test_forecast_results_endpoint(self):
        response = self.client.get("/api/forecast/results")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("forecasts", data)
        self.assertIn("kpis", data)
        self.assertGreater(len(data["forecasts"]), 0)

    def test_insights_endpoint(self):
        response = self.client.get("/api/forecast/insights")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("weekday_heatmap", data)
        self.assertIn("peak_day", data)
        self.assertIn("recommendations", data)
        self.assertGreater(len(data["recommendations"]), 0)

    def test_models_endpoint(self):
        response = self.client.get("/api/forecast/models")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)


if __name__ == '__main__':
    unittest.main()
