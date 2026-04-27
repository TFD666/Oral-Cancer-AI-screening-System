import unittest

from app.clinical_logic import (
    normalize_prediction_record,
    recommendation_for,
    risk_from_cancer_score,
)


class ClinicalLogicTests(unittest.TestCase):
    def test_risk_comes_from_cancer_score(self):
        self.assertEqual(risk_from_cancer_score(0.92), "High")
        self.assertEqual(risk_from_cancer_score(0.72), "Medium")
        self.assertEqual(risk_from_cancer_score(0.18), "Low")

    def test_non_cancer_legacy_high_risk_is_normalized(self):
        normalized = normalize_prediction_record(
            {
                "prediction": "Non-Cancer",
                "confidence": 0.99,
                "risk_level": "High",
                "recommendation": "Routine monitoring advised.",
            }
        )

        self.assertEqual(normalized["risk_level"], "Low")
        self.assertEqual(normalized["recommendation"], "Routine monitoring advised.")
        self.assertEqual(normalized["model_confidence"], 0.99)

    def test_cancer_records_are_not_modified(self):
        normalized = normalize_prediction_record(
            {
                "prediction": "Cancer",
                "confidence": 0.93,
                "risk_level": "High",
                "recommendation": "Immediate clinical evaluation and biopsy recommended.",
            }
        )

        self.assertEqual(normalized["risk_level"], "High")
        self.assertEqual(
            normalized["recommendation"],
            "Immediate clinical evaluation and biopsy recommended.",
        )

    def test_recommendation_matrix(self):
        self.assertEqual(
            recommendation_for("Cancer", "High"),
            "Immediate clinical evaluation and biopsy recommended.",
        )
        self.assertEqual(
            recommendation_for("Cancer", "Medium"),
            "Further diagnostic testing recommended.",
        )
        self.assertEqual(
            recommendation_for("Non-Cancer", "Low"),
            "Routine monitoring advised.",
        )


if __name__ == "__main__":
    unittest.main()
