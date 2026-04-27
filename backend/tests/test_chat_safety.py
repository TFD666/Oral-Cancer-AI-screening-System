import unittest

from app.routers.chat import (
    SYSTEM_PROMPT,
    build_context,
    build_llm_messages,
    build_summary_messages,
    detect_intent,
    extract_context_prediction,
    extract_context_risk_level,
    fetch_memory,
    format_model_confidence,
    format_scan_context,
    has_prediction_contradiction,
    intent_suggestions,
    friendly_llm_failure,
    repeated_intent,
    safe_scan_explanation,
)
import app.state as state


class ChatSafetyTests(unittest.TestCase):
    def test_model_confidence_format_defines_certainty_not_probability(self):
        self.assertEqual(
            format_model_confidence(0.89),
            "89% (model certainty, NOT probability of disease)",
        )

    def test_scan_context_uses_prediction_risk_then_model_confidence(self):
        context = format_scan_context(
            "Latest Scan",
            {
                "prediction": "Cancer",
                "risk_level": "High",
                "confidence": 0.89,
                "recommendation": "Consult doctor",
                "timestamp": "2026-04-26T02:00:00Z",
            },
        )

        self.assertIn("- Prediction: Cancer", context)
        self.assertIn("- Risk Level: High", context)
        self.assertIn(
            "- Model Confidence: 89% (model certainty, NOT probability of disease)",
            context,
        )
        self.assertNotIn("- Confidence:", context)
        self.assertLess(context.index("- Prediction:"), context.index("- Risk Level:"))
        self.assertLess(context.index("- Risk Level:"), context.index("- Model Confidence:"))

    def test_system_prompt_blocks_confidence_as_disease_probability(self):
        self.assertIn(
            "Confidence is model certainty, NOT probability",
            SYSTEM_PROMPT,
        )
        self.assertIn("Never interpret model confidence as likelihood of disease", SYSTEM_PROMPT)
        self.assertIn("Explain seriousness", SYSTEM_PROMPT)

    def test_intent_detection_and_suggestions(self):
        self.assertEqual(detect_intent("is this serious?"), "seriousness")
        self.assertEqual(detect_intent("what should I do next?"), "action")
        self.assertEqual(detect_intent("explain my risk"), "explanation")
        self.assertEqual(detect_intent("I have mouth ulcers"), "symptom")
        self.assertEqual(
            intent_suggestions("seriousness", True),
            ["What should I do next?", "Explain my result"],
        )
        self.assertEqual(
            intent_suggestions("action", True),
            ["How urgent is this?", "Can I wait before seeing a doctor?"],
        )

    def test_extract_context_metadata(self):
        context = (
            "Latest Scan:\n"
            "- Prediction: Non-Cancer\n"
            "- Risk Level: Low\n"
            "- Model Confidence: 91% (model certainty, NOT probability of disease)"
        )

        self.assertEqual(extract_context_prediction(context), "Non-Cancer")
        self.assertEqual(extract_context_risk_level(context), "Low")

    def test_contradiction_detection_for_cancer_prediction(self):
        self.assertTrue(
            has_prediction_contradiction(
                "This appears non-cancerous based on the scan.",
                "Cancer",
            )
        )
        self.assertFalse(
            has_prediction_contradiction(
                "This is a High risk result with a Cancer prediction.",
                "Cancer",
            )
        )

    def test_contradiction_detection_for_non_cancer_prediction(self):
        self.assertTrue(
            has_prediction_contradiction(
                "Cancer was detected by the scan.",
                "Non-Cancer",
            )
        )
        self.assertFalse(
            has_prediction_contradiction(
                "This is a Low risk result with a Non-Cancer prediction.",
                "Non-Cancer",
            )
        )

    def test_safe_fallback_preserves_prediction_label(self):
        cancer_reply = safe_scan_explanation("Cancer", "High")
        non_cancer_reply = safe_scan_explanation("Non-Cancer", "Low")

        self.assertIn("Cancer prediction", cancer_reply)
        self.assertNotIn("non-cancerous", cancer_reply.lower())
        self.assertIn("Non-Cancer prediction", non_cancer_reply)
        self.assertNotIn("cancer was detected", non_cancer_reply.lower())

    def test_repeated_intent_uses_last_user_message(self):
        memory = [
            {"role": "user", "message": "Explain my result"},
            {"role": "assistant", "message": "Here is what it means."},
        ]
        self.assertTrue(repeated_intent(memory, "explanation"))
        self.assertFalse(repeated_intent(memory, "action"))

    def test_prompt_order_is_context_then_memory_then_current_input(self):
        messages = build_llm_messages(
            "Is this serious?",
            "Latest Scan Context:\n- Prediction: Non-Cancer",
            [{"role": "user", "message": "Explain my result"}],
            "result",
            intent="seriousness",
            is_repeated_intent=False,
        )

        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("Latest Scan Context", messages[1]["content"])
        self.assertIn("Detected intent: seriousness", messages[2]["content"])
        self.assertEqual(messages[3], {"role": "user", "content": "Explain my result"})
        self.assertEqual(messages[-1], {"role": "user", "content": "Is this serious?"})

    def test_summary_prompt_is_short_and_scan_context_only(self):
        messages = build_summary_messages("Latest Scan Context:\n- Prediction: Non-Cancer")

        self.assertEqual(len(messages), 3)
        self.assertIn("2-3 lines", messages[1]["content"])
        self.assertEqual(messages[-1], {"role": "user", "content": "Summarize this scan result."})

    def test_friendly_llm_failure_uses_scan_context_when_present(self):
        self.assertIn("scan context", friendly_llm_failure(True).lower())
        self.assertIn("oral health concerns", friendly_llm_failure(False).lower())


class FakeQuery:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.calls = []

    def select(self, value):
        self.calls.append(("select", value))
        return self

    def eq(self, key, value):
        self.calls.append(("eq", key, value))
        return self

    def is_(self, key, value):
        self.calls.append(("is_", key, value))
        return self

    def order(self, key, desc=False):
        self.calls.append(("order", key, desc))
        return self

    def limit(self, value):
        self.calls.append(("limit", value))
        return self

    def execute(self):
        return type("Response", (), {"data": self.rows})()


class FakeSupabase:
    def __init__(self, query):
        self.query = query

    def table(self, name):
        self.query.calls.append(("table", name))
        return self.query


class ChatMemoryTests(unittest.TestCase):
    def test_general_memory_filters_scan_id_null(self):
        old = state.supabase_admin
        query = FakeQuery(rows=[{"role": "user", "message": "hello"}])
        state.supabase_admin = FakeSupabase(query)
        try:
            memory = fetch_memory("user-1", None)
        finally:
            state.supabase_admin = old

        self.assertEqual(memory, [{"role": "user", "message": "hello"}])
        self.assertIn(("is_", "scan_id", "null"), query.calls)
        self.assertNotIn(("eq", "scan_id", None), query.calls)

    def test_scan_memory_filters_exact_scan_id(self):
        old = state.supabase_admin
        query = FakeQuery(rows=[{"role": "assistant", "message": "scan reply"}])
        state.supabase_admin = FakeSupabase(query)
        try:
            memory = fetch_memory("user-1", "scan-1")
        finally:
            state.supabase_admin = old

        self.assertEqual(memory, [{"role": "assistant", "message": "scan reply"}])
        self.assertIn(("eq", "scan_id", "scan-1"), query.calls)


if __name__ == "__main__":
    unittest.main()
