#!/bin/bash
# Backend Test Runner Script
# Run comprehensive tests for Phase 1 Backend API Proxy

set -e

echo "=================================="
echo "Phase 1 Backend API Proxy Tests"
echo "=================================="
echo ""

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry not found. Installing poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    export PATH="$HOME/.local/bin:$PATH"
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Python version: $PYTHON_VERSION"

# Install dependencies if needed
if [ ! -d ".venv" ]; then
    echo "📦 Installing dependencies with poetry..."
    poetry install
else
    echo "✅ Dependencies already installed"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your API keys:"
    echo "   - GEMINI_API_KEY (required)"
    echo "   - ANTHROPIC_API_KEY (optional)"
    echo "   - JWT_SECRET_KEY (generate with: openssl rand -hex 32)"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Run tests
echo ""
echo "🧪 Running tests..."
echo ""

poetry run pytest tests/test_ai_routes.py -v --tb=short

echo ""
echo "=================================="
echo "✅ Tests Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Review test results above"
echo "2. Check coverage report: backend/htmlcov/index.html"
echo "3. Verify all 17 tests passed"
echo "4. Proceed to Phase 2 if all tests pass"
echo ""
