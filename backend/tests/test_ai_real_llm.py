"""
Real LLM Integration Tests for AI Routes
Tests all 7 AI endpoints with REAL Gemini/Anthropic API calls (no mocking)

These tests validate actual AI behavior and require:
- GEMINI_API_KEY environment variable
- Backend server running with LLM service configured
- Network access to Google/Anthropic APIs

Run with: pytest backend/tests/test_ai_real_llm.py -v -s
Use -s to see real AI responses in console output
"""
import pytest
import os
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.models import db, User
from app.auth import create_access_token


# Skip all tests if no API key (allows CI/CD without keys)
pytestmark = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not set - skipping real LLM tests"
)


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create a test user for authentication"""
    user_id = db.generate_id()
    user = User(
        id=user_id,
        email="test_real_llm@example.com",
        password_hash="hashed_password",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.users[user_id] = user
    db.users_by_email["test_real_llm@example.com"] = user_id
    yield user
    # Cleanup
    if user_id in db.users:
        del db.users[user_id]
    if "test_real_llm@example.com" in db.users_by_email:
        del db.users_by_email["test_real_llm@example.com"]


@pytest.fixture
def auth_headers(test_user):
    """Generate JWT authentication headers"""
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_clinical_text():
    """Real clinical research paper excerpt for testing"""
    return """
    Suboccipital Decompressive Craniectomy for Malignant Cerebellar Infarction

    ABSTRACT
    Background: Malignant cerebellar infarction carries high mortality despite medical management.
    We evaluated the efficacy of suboccipital decompressive craniectomy (SDC) in this condition.

    Methods: We performed a retrospective matched case-control study of 57 patients with
    malignant cerebellar infarction. Twenty-nine patients underwent SDC plus best medical
    treatment (BMT), while 28 received BMT alone. Primary outcome was modified Rankin Scale
    (mRS) at 12-month follow-up.

    Results: The SDC group had significantly better outcomes (mRS 0-2: 55% vs 21%, p=0.006).
    Mortality was lower in the SDC group (17% vs 43%, p=0.04). Complications included
    CSF leak (10%) and subdural hematoma (7%).

    Conclusion: Suboccipital decompressive craniectomy improves outcomes in malignant
    cerebellar infarction with acceptable morbidity.

    DOI: 10.3171/2016.2.JNS151851
    PMID: 27231976
    Journal: Journal of Neurosurgery
    Year: 2016
    """


class TestRealLLM_GeneratePICO:
    """Test PICO extraction with real Gemini API calls"""

    def test_real_pico_extraction(self, client, auth_headers, sample_clinical_text):
        """
        Test PICO extraction using real Gemini API
        Validates that the AI correctly identifies all 6 PICO-T fields
        """
        response = client.post(
            "/api/ai/generate-pico",
            json={"document_id": "test-doc-001", "pdf_text": sample_clinical_text},
            headers=auth_headers,
            timeout=60.0  # Real API calls need longer timeout
        )

        assert response.status_code == 200, f"Failed with: {response.json()}"
        data = response.json()

        # Validate all 6 PICO-T fields are present
        required_fields = ["population", "intervention", "comparator", "outcomes", "timing", "study_type"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert len(data[field]) > 0, f"Empty field: {field}"

        # Validate semantic correctness of extracted data
        print(f"\n✓ REAL PICO EXTRACTION RESULTS:")
        print(f"  Population: {data['population']}")
        print(f"  Intervention: {data['intervention']}")
        print(f"  Comparator: {data['comparator']}")
        print(f"  Outcomes: {data['outcomes']}")
        print(f"  Timing: {data['timing']}")
        print(f"  Study Type: {data['study_type']}")

        # Semantic validation: check AI understood the content
        assert "cerebellar" in data["population"].lower() or "infarction" in data["population"].lower()
        assert "craniectomy" in data["intervention"].lower() or "SDC" in data["intervention"]
        assert "mRS" in data["outcomes"] or "rankin" in data["outcomes"].lower()


class TestRealLLM_GenerateSummary:
    """Test summary generation with real Gemini API calls"""

    def test_real_summary_generation(self, client, auth_headers, sample_clinical_text):
        """
        Test summary generation using real Gemini API
        Validates quality and coherence of AI-generated summary
        """
        response = client.post(
            "/api/ai/generate-summary",
            json={"document_id": "test-doc-002", "pdf_text": sample_clinical_text},
            headers=auth_headers,
            timeout=60.0
        )

        assert response.status_code == 200
        data = response.json()

        assert "summary" in data
        summary = data["summary"]

        # Quality validation
        assert len(summary) >= 100, "Summary too short"
        assert len(summary) <= 2000, "Summary too long (AI generated high-quality detailed summary)"

        print(f"\n✓ REAL SUMMARY GENERATION:")
        print(f"  Length: {len(summary)} characters")
        print(f"  Content: {summary[:200]}...")

        # Semantic validation: summary should capture key points
        summary_lower = summary.lower()
        key_concepts = ["cerebellar", "craniectomy", "outcome", "mortality"]
        matched_concepts = sum(1 for concept in key_concepts if concept in summary_lower)
        assert matched_concepts >= 2, f"Summary missing key concepts (matched {matched_concepts}/4)"


class TestRealLLM_ValidateField:
    """Test field validation with real Gemini API calls"""

    def test_real_validation_supported(self, client, auth_headers, sample_clinical_text):
        """
        Test field validation with a value that SHOULD be supported
        Validates AI can verify factual claims
        """
        response = client.post(
            "/api/ai/validate-field",
            json={
                "document_id": "test-doc-003",
                "field_id": "sample_size",
                "field_value": "57 patients",
                "pdf_text": sample_clinical_text
            },
            headers=auth_headers,
            timeout=60.0
        )

        assert response.status_code == 200
        data = response.json()

        assert data["is_supported"] is True, "AI should confirm 57 patients is supported"
        assert data["confidence"] > 0.7, "Confidence should be high for clear match"
        assert "57" in data["quote"], "Quote should contain the validated number"

        print(f"\n✓ REAL VALIDATION (Supported):")
        print(f"  Is Supported: {data['is_supported']}")
        print(f"  Confidence: {data['confidence']}")
        print(f"  Quote: {data['quote']}")

    def test_real_validation_not_supported(self, client, auth_headers, sample_clinical_text):
        """
        Test field validation with a value that should NOT be supported
        Validates AI can reject incorrect claims
        """
        response = client.post(
            "/api/ai/validate-field",
            json={
                "document_id": "test-doc-004",
                "field_id": "sample_size",
                "field_value": "500 patients",
                "pdf_text": sample_clinical_text
            },
            headers=auth_headers,
            timeout=60.0
        )

        assert response.status_code == 200
        data = response.json()

        assert data["is_supported"] is False, "AI should reject incorrect patient count"

        print(f"\n✓ REAL VALIDATION (Not Supported):")
        print(f"  Is Supported: {data['is_supported']}")
        print(f"  Confidence: {data['confidence']}")


class TestRealLLM_FindMetadata:
    """Test metadata extraction with real Gemini API calls"""

    def test_real_metadata_extraction(self, client, auth_headers, sample_clinical_text):
        """
        Test metadata extraction using real Gemini API
        Validates AI can identify DOI, PMID, journal, year
        """
        response = client.post(
            "/api/ai/find-metadata",
            json={"document_id": "test-doc-005", "pdf_text": sample_clinical_text},
            headers=auth_headers,
            timeout=60.0
        )

        assert response.status_code == 200
        data = response.json()

        print(f"\n✓ REAL METADATA EXTRACTION:")
        print(f"  DOI: {data.get('doi')}")
        print(f"  PMID: {data.get('pmid')}")
        print(f"  Journal: {data.get('journal')}")
        print(f"  Year: {data.get('year')}")

        # Validate at least some metadata was extracted
        assert data.get("doi") or data.get("pmid") or data.get("journal"), "Should extract at least one metadata field"

        # Semantic validation if DOI/PMID found
        if data.get("doi"):
            assert "10." in data["doi"], "DOI should start with 10."
        if data.get("pmid"):
            assert len(str(data["pmid"])) >= 7, "PMID should be 7-8 digits"


class TestRealLLM_ExtractTables:
    """Test table extraction with real Gemini API calls"""

    def test_real_table_extraction(self, client, auth_headers):
        """
        Test table extraction using real Gemini API
        Uses text with clear tabular data
        """
        text_with_table = """
        Table 1: Patient Outcomes by Treatment Group

        | Outcome           | SDC Group (n=29) | BMT Alone (n=28) | P-value |
        |-------------------|------------------|------------------|---------|
        | mRS 0-2 at 12mo   | 16 (55%)         | 6 (21%)          | 0.006   |
        | Mortality         | 5 (17%)          | 12 (43%)         | 0.04    |
        | CSF Leak          | 3 (10%)          | 0 (0%)           | 0.08    |

        The results demonstrate significant benefit of surgical intervention.
        """

        response = client.post(
            "/api/ai/extract-tables",
            json={"document_id": "test-doc-006", "pdf_text": text_with_table},
            headers=auth_headers,
            timeout=60.0
        )

        assert response.status_code == 200
        data = response.json()

        assert "tables" in data
        tables = data["tables"]

        print(f"\n✓ REAL TABLE EXTRACTION:")
        print(f"  Tables Found: {len(tables)}")
        if tables:
            print(f"  First Table Title: {tables[0].get('title', 'N/A')}")
            print(f"  Rows: {len(tables[0].get('data', []))}")

        # Validate table structure if any found
        if len(tables) > 0:
            table = tables[0]
            assert "title" in table or "data" in table
            if "data" in table:
                assert len(table["data"]) > 0, "Table should have data rows"


class TestRealLLM_AnalyzeImage:
    """Test image analysis with real Gemini Vision API calls"""

    def test_real_image_analysis(self, client, auth_headers):
        """
        Test image analysis using real Gemini Vision API
        Uses a minimal PNG image (1x1 pixel)
        """
        # Minimal valid PNG (1x1 red pixel)
        image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

        response = client.post(
            "/api/ai/analyze-image",
            json={
                "document_id": "test-doc-007",
                "image_base64": image_base64,
                "prompt": "Describe what you see in this image"
            },
            headers=auth_headers,
            timeout=60.0
        )

        assert response.status_code == 200
        data = response.json()

        assert "analysis" in data
        analysis = data["analysis"]
        assert len(analysis) > 20, "Analysis should contain meaningful content"

        print(f"\n✓ REAL IMAGE ANALYSIS:")
        print(f"  Length: {len(analysis)} characters")
        print(f"  Content: {analysis[:200]}...")


class TestRealLLM_DeepAnalysis:
    """Test deep analysis with real Gemini API calls"""

    def test_real_deep_analysis(self, client, auth_headers, sample_clinical_text):
        """
        Test deep analysis using real Gemini API
        Validates AI can provide critical evaluation
        """
        response = client.post(
            "/api/ai/deep-analysis",
            json={
                "document_id": "test-doc-008",
                "pdf_text": sample_clinical_text,
                "prompt": "Critically evaluate the study methodology, including strengths and limitations"
            },
            headers=auth_headers,
            timeout=90.0  # Deep analysis needs more time
        )

        assert response.status_code == 200
        data = response.json()

        assert "analysis" in data
        analysis = data["analysis"]

        # Quality validation
        assert len(analysis) >= 150, "Deep analysis should be comprehensive"

        print(f"\n✓ REAL DEEP ANALYSIS:")
        print(f"  Length: {len(analysis)} characters")
        print(f"  Content: {analysis[:300]}...")

        # Semantic validation: should contain analytical language
        analysis_lower = analysis.lower()
        analytical_terms = ["strength", "limitation", "however", "although", "suggest", "indicate"]
        matched_terms = sum(1 for term in analytical_terms if term in analysis_lower)
        assert matched_terms >= 1, "Analysis should contain critical evaluation language"


class TestRealLLM_Authentication:
    """Test authentication enforcement with real LLM endpoints"""

    def test_all_endpoints_require_auth(self, client, sample_clinical_text):
        """
        Verify all 7 AI endpoints reject unauthenticated requests
        Ensures security even with real LLM calls
        """
        endpoints = [
            ("/api/ai/generate-pico", {"document_id": "test", "pdf_text": sample_clinical_text}),
            ("/api/ai/generate-summary", {"document_id": "test", "pdf_text": sample_clinical_text}),
            ("/api/ai/validate-field", {"document_id": "test", "field_id": "test", "field_value": "test", "pdf_text": sample_clinical_text}),
            ("/api/ai/find-metadata", {"document_id": "test", "pdf_text": sample_clinical_text}),
            ("/api/ai/extract-tables", {"document_id": "test", "pdf_text": sample_clinical_text}),
            ("/api/ai/analyze-image", {"document_id": "test", "image_base64": "data:image/png;base64,iVBORw0KGg", "prompt": "test"}),
            ("/api/ai/deep-analysis", {"document_id": "test", "pdf_text": sample_clinical_text, "prompt": "test"}),
        ]

        print(f"\n✓ AUTHENTICATION ENFORCEMENT:")
        for endpoint, payload in endpoints:
            response = client.post(endpoint, json=payload)
            # Backend returns 403 Forbidden (both 401 and 403 are secure)
            assert response.status_code in [401, 403], f"{endpoint} should reject without auth (got {response.status_code})"
            print(f"  {endpoint}: ✓ Rejected ({response.status_code})")


class TestRealLLM_RateLimiting:
    """Test rate limiting with real LLM endpoints"""

    @pytest.mark.slow
    def test_rate_limit_enforcement(self, client, auth_headers, sample_clinical_text):
        """
        Test rate limiting enforcement (10 requests/minute default)
        WARNING: This test makes 11 real API calls and may be slow/expensive
        """
        print(f"\n✓ RATE LIMITING TEST (Making 11 real API calls):")

        success_count = 0
        rate_limited_count = 0

        for i in range(11):
            response = client.post(
                "/api/ai/generate-summary",
                json={"document_id": f"rate-test-{i}", "pdf_text": sample_clinical_text[:500]},  # Use shorter text
                headers=auth_headers,
                timeout=60.0
            )

            if response.status_code == 200:
                success_count += 1
                print(f"  Request {i+1}: ✓ Success (200)")
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"  Request {i+1}: ✓ Rate Limited (429)")
            else:
                print(f"  Request {i+1}: ✗ Unexpected status {response.status_code}")

        # Should have ~10 successes and 1+ rate limited
        assert success_count <= 10, f"Should enforce rate limit after 10 requests (got {success_count} successes)"
        assert rate_limited_count >= 1, "Should have at least 1 rate-limited request"

        print(f"  Total Success: {success_count}/11")
        print(f"  Total Rate Limited: {rate_limited_count}/11")


class TestRealLLM_ErrorRecovery:
    """Test error handling and recovery with real LLM calls"""

    def test_oversized_request_rejection(self, client, auth_headers):
        """
        Test that oversized requests (>1MB) are rejected before hitting LLM
        Validates input validation
        """
        large_text = "A" * 1_100_000  # 1.1MB

        response = client.post(
            "/api/ai/generate-pico",
            json={"document_id": "test-large", "pdf_text": large_text},
            headers=auth_headers
        )

        assert response.status_code == 413, "Should reject oversized requests"
        print(f"\n✓ OVERSIZED REQUEST REJECTION: Status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
