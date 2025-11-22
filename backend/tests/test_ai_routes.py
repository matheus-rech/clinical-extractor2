"""
Test suite for AI proxy routes
Tests all 7 AI endpoints with mocked Gemini/Anthropic responses
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from app.main import app
from app.models import db, User
from app.auth import create_access_token


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create a test user"""
    user_id = db.generate_id()
    user = User(
        id=user_id,
        email="test@example.com",
        password_hash="hashed_password",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.users[user_id] = user
    db.users_by_email["test@example.com"] = user_id
    yield user
    # Cleanup
    if user_id in db.users:
        del db.users[user_id]
    if "test@example.com" in db.users_by_email:
        del db.users_by_email["test@example.com"]


@pytest.fixture
def auth_headers(test_user):
    """Generate authentication headers"""
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_pdf_text():
    """Sample PDF text for testing"""
    return """
    Clinical Study: Cerebellar Stroke Management

    ABSTRACT
    This randomized controlled trial evaluated the efficacy of decompressive
    craniectomy in patients with acute cerebellar stroke.

    METHODS
    We enrolled 150 patients with cerebellar infarction between 2015-2020.
    Patients were randomly assigned to surgical decompression (n=75) or
    conservative medical management (n=75).

    RESULTS
    The primary outcome was 90-day mortality. Mortality was significantly
    lower in the surgical group (15%) compared to conservative group (35%),
    p<0.001. Modified Rankin Scale (mRS) scores were also better in the
    surgical group.

    CONCLUSIONS
    Decompressive craniectomy reduces mortality in acute cerebellar stroke.

    DOI: 10.1001/neurosurgery.2020.12345
    PMID: 12345678
    Journal: Neurosurgery
    Year: 2020
    """


class TestGeneratePICO:
    """Tests for /api/ai/generate-pico endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_generate_pico_success(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test successful PICO generation"""
        # Mock Gemini response
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """{
            "population": "Patients with acute cerebellar stroke",
            "intervention": "Decompressive craniectomy",
            "comparator": "Conservative medical management",
            "outcomes": "90-day mortality, mRS scores",
            "timing": "2015-2020, 90-day follow-up",
            "study_type": "Randomized controlled trial"
        }"""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/generate-pico",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "population" in data
        assert "intervention" in data
        assert "cerebellar stroke" in data["population"].lower()

    def test_generate_pico_unauthorized(self, client, sample_pdf_text):
        """Test PICO generation without authentication"""
        response = client.post(
            "/api/ai/generate-pico",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text}
        )

        assert response.status_code == 401

    def test_generate_pico_too_large(self, client, auth_headers):
        """Test PICO generation with text exceeding size limit"""
        large_text = "A" * 1_100_000  # Over 1MB

        response = client.post(
            "/api/ai/generate-pico",
            json={"document_id": "test-doc", "pdf_text": large_text},
            headers=auth_headers
        )

        assert response.status_code == 413
        assert "too large" in response.json()["detail"].lower()


class TestGenerateSummary:
    """Tests for /api/ai/generate-summary endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_generate_summary_success(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test successful summary generation"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """This randomized controlled trial
        evaluated decompressive craniectomy in 150 patients with acute cerebellar stroke.
        The surgical intervention significantly reduced 90-day mortality (15% vs 35%, p<0.001)
        and improved functional outcomes. These findings support early surgical intervention
        in this patient population."""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/generate-summary",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert len(data["summary"]) > 100

    def test_generate_summary_unauthorized(self, client, sample_pdf_text):
        """Test summary generation without authentication"""
        response = client.post(
            "/api/ai/generate-summary",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text}
        )

        assert response.status_code == 401


class TestValidateField:
    """Tests for /api/ai/validate-field endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_validate_field_supported(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test field validation when value is supported"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """{
            "is_supported": true,
            "quote": "We enrolled 150 patients with cerebellar infarction",
            "confidence": 0.95
        }"""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/validate-field",
            json={
                "document_id": "test-doc",
                "field_id": "sample_size",
                "field_value": "150",
                "pdf_text": sample_pdf_text
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_supported"] is True
        assert data["confidence"] > 0.8
        assert "150" in data["quote"]

    @patch('app.services.llm.GeminiClient')
    def test_validate_field_not_supported(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test field validation when value is not supported"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """{
            "is_supported": false,
            "quote": "No mention of 500 patients in the document",
            "confidence": 0.98
        }"""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/validate-field",
            json={
                "document_id": "test-doc",
                "field_id": "sample_size",
                "field_value": "500",
                "pdf_text": sample_pdf_text
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_supported"] is False


class TestFindMetadata:
    """Tests for /api/ai/find-metadata endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_find_metadata_success(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test successful metadata extraction"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """{
            "doi": "10.1001/neurosurgery.2020.12345",
            "pmid": "12345678",
            "journal": "Neurosurgery",
            "year": 2020
        }"""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/find-metadata",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["doi"] == "10.1001/neurosurgery.2020.12345"
        assert data["pmid"] == "12345678"
        assert data["year"] == 2020

    @patch('app.services.llm.GeminiClient')
    def test_find_metadata_partial(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test metadata extraction with missing fields"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """{
            "doi": null,
            "pmid": null,
            "journal": "Neurosurgery",
            "year": 2020
        }"""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/find-metadata",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["doi"] is None
        assert data["pmid"] is None
        assert data["journal"] == "Neurosurgery"


class TestExtractTables:
    """Tests for /api/ai/extract-tables endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_extract_tables_success(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test successful table extraction"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """{
            "tables": [
                {
                    "title": "Table 1: Baseline Characteristics",
                    "description": "Patient demographics and clinical features",
                    "data": [
                        ["Characteristic", "Surgical (n=75)", "Conservative (n=75)"],
                        ["Mean age (years)", "65±10", "67±12"],
                        ["Male (%)", "55", "52"]
                    ]
                }
            ]
        }"""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/extract-tables",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "tables" in data
        assert len(data["tables"]) > 0
        assert "title" in data["tables"][0]

    @patch('app.services.llm.GeminiClient')
    def test_extract_tables_no_tables(self, mock_gemini, client, auth_headers):
        """Test table extraction with no tables found"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = '{"tables": []}'
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/extract-tables",
            json={"document_id": "test-doc", "pdf_text": "No tables in this text."},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tables"] == []


class TestAnalyzeImage:
    """Tests for /api/ai/analyze-image endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_analyze_image_success(self, mock_gemini, client, auth_headers):
        """Test successful image analysis"""
        mock_instance = MagicMock()
        mock_instance.generate_vision.return_value = """This CT scan shows a large
        cerebellar infarction with mass effect and compression of the fourth ventricle.
        There is evidence of hydrocephalus."""
        mock_gemini.return_value = mock_instance

        # Mock base64 image (minimal PNG)
        image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

        response = client.post(
            "/api/ai/analyze-image",
            json={
                "document_id": "test-doc",
                "image_base64": image_base64,
                "prompt": "Describe the findings in this CT scan"
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "analysis" in data
        assert len(data["analysis"]) > 50


class TestDeepAnalysis:
    """Tests for /api/ai/deep-analysis endpoint"""

    @patch('app.services.llm.GeminiClient')
    def test_deep_analysis_success(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test successful deep analysis"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = """This study provides strong
        evidence for surgical intervention in cerebellar stroke. The 20% absolute
        risk reduction in mortality is clinically significant. However, the study
        lacks long-term outcomes beyond 90 days and does not stratify results by
        infarct size or location."""
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/deep-analysis",
            json={
                "document_id": "test-doc",
                "pdf_text": sample_pdf_text,
                "prompt": "Critically evaluate the study methodology and findings"
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "analysis" in data
        assert len(data["analysis"]) > 100


class TestRateLimiting:
    """Tests for rate limiting on AI endpoints"""

    @patch('app.services.llm.GeminiClient')
    def test_rate_limit_enforcement(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test that rate limiting is enforced"""
        mock_instance = MagicMock()
        mock_instance.generate_text.return_value = '{"summary": "Test summary"}'
        mock_gemini.return_value = mock_instance

        # Make 11 requests (exceeds default limit of 10)
        for i in range(11):
            response = client.post(
                "/api/ai/generate-summary",
                json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
                headers=auth_headers
            )

            if i < 10:
                assert response.status_code == 200
            else:
                # 11th request should be rate limited
                assert response.status_code == 429


class TestErrorHandling:
    """Tests for error handling in AI endpoints"""

    @patch('app.services.llm.GeminiClient')
    def test_gemini_api_error(self, mock_gemini, client, auth_headers, sample_pdf_text):
        """Test handling of Gemini API errors"""
        mock_instance = MagicMock()
        mock_instance.generate_text.side_effect = Exception("API quota exceeded")
        mock_gemini.return_value = mock_instance

        response = client.post(
            "/api/ai/generate-summary",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 500
        assert "failed" in response.json()["detail"].lower()

    def test_invalid_json_request(self, client, auth_headers):
        """Test handling of invalid JSON in request"""
        response = client.post(
            "/api/ai/generate-summary",
            json={"pdf_text": 12345},  # Invalid: should be string
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error


class TestFallbackProvider:
    """Tests for LLM provider fallback functionality"""

    @patch('app.services.llm.AnthropicClient')
    @patch('app.services.llm.GeminiClient')
    def test_fallback_to_anthropic(self, mock_gemini, mock_anthropic, client, auth_headers, sample_pdf_text):
        """Test fallback from Gemini to Anthropic on retryable error"""
        # Gemini fails with retryable error
        mock_gemini_instance = MagicMock()
        mock_gemini_instance.generate_text.side_effect = Exception("429 rate limit exceeded")
        mock_gemini.return_value = mock_gemini_instance

        # Anthropic succeeds
        mock_anthropic_instance = MagicMock()
        mock_anthropic_instance.generate_text.return_value = """Test summary from Claude"""
        mock_anthropic.return_value = mock_anthropic_instance

        response = client.post(
            "/api/ai/generate-summary",
            json={"document_id": "test-doc", "pdf_text": sample_pdf_text},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
