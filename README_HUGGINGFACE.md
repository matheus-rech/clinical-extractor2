# Hugging Face Spaces Deployment

## Overview

Deploy Clinical Extractor to Hugging Face Spaces with Docker for **FREE** GPU-accelerated hosting.

**URL**: https://huggingface.co/spaces/your-username/clinical-extractor

---

## 🚀 Deployment Steps

### Option 1: Docker Space (Recommended)

**1. Create Space:**
```bash
# Install Hugging Face CLI
pip install huggingface_hub

# Login
huggingface-cli login

# Create space
huggingface-cli repo create clinical-extractor --type space --space_sdk docker
```

**2. Clone and Configure:**
```bash
# Clone your space
git clone https://huggingface.co/spaces/your-username/clinical-extractor
cd clinical-extractor

# Copy project files
cp -r /path/to/a_consulta/* .
```

**3. Create Dockerfile for Hugging Face:**

Already exists as `Dockerfile.frontend`, but create `Dockerfile.huggingface` for combined deployment:

```dockerfile
# Multi-service Dockerfile for Hugging Face Spaces
FROM python:3.11-slim as backend

WORKDIR /app/backend

# Install Poetry
RUN pip install poetry

# Copy backend
COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry config virtualenvs.create false && poetry install

COPY backend/app ./app

# Frontend build
FROM node:18-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Combined runtime
FROM python:3.11-slim

# Install Node.js for serving frontend
RUN apt-get update && apt-get install -y nodejs npm nginx && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend /app/backend /app/backend

# Copy frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Nginx config for SPA
RUN echo 'server { \
    listen 7860; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location /api { proxy_pass http://localhost:8000; } \
}' > /etc/nginx/sites-available/default

EXPOSE 7860

# Start both services
CMD nginx && cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**4. Create README.md for Space:**

```markdown
---
title: Clinical Extractor
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: apache-2.0
---

# Clinical Extractor

AI-powered medical research data extraction platform with multi-agent AI pipeline.

## Features
- 6 specialized medical research agents
- PDF processing with geometric extraction
- PICO-T extraction
- Multi-format export (JSON, CSV, Excel)

## Usage
Visit: https://huggingface.co/spaces/your-username/clinical-extractor
```

**5. Push to Hugging Face:**
```bash
git add .
git commit -m "feat: Add Hugging Face Space deployment"
git push
```

**6. Configure Secrets:**
- Go to Space Settings → Repository Secrets
- Add `GEMINI_API_KEY`

---

### Option 2: Gradio Space (Alternative)

If you prefer a Gradio interface:

**1. Create `app.py`:**

```python
import gradio as gr
import os
from backend.app.main import app as fastapi_app

def extract_pico(pdf_file):
    """Extract PICO-T from PDF"""
    # Call your backend functions here
    pass

# Gradio interface
with gr.Blocks() as demo:
    gr.Markdown("# Clinical Extractor")

    with gr.Tab("Upload PDF"):
        pdf_input = gr.File(label="Upload PDF", file_types=[".pdf"])
        extract_btn = gr.Button("Extract PICO-T")
        output = gr.JSON(label="Results")

        extract_btn.click(extract_pico, inputs=pdf_input, outputs=output)

if __name__ == "__main__":
    demo.launch(server_port=7860)
```

**2. Create `requirements.txt`:**
```txt
gradio==4.7.1
fastapi==0.104.1
uvicorn==0.24.0
pdfplumber==0.10.3
google-generativeai==0.3.1
```

**3. Push to Hugging Face:**
```bash
git add app.py requirements.txt
git commit -m "feat: Add Gradio interface"
git push
```

---

## 🔧 Configuration

### Environment Variables

Add in Space Settings → Repository Secrets:
```bash
GEMINI_API_KEY=your_api_key_here
HF_TOKEN=your_huggingface_token
```

### Space Configuration (README.md front matter)

```yaml
---
title: Clinical Extractor
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker  # or gradio
sdk_version: 4.7.1  # if using Gradio
app_file: app.py  # if using Gradio
pinned: false
license: apache-2.0
duplicated_from: your-username/clinical-extractor
---
```

---

## 📊 Features

### FREE Tier Includes:
- ✅ 16GB RAM
- ✅ 2 CPU cores
- ✅ 50GB storage
- ✅ Persistent storage
- ✅ Custom domain (spaces.huggingface.co)
- ✅ Auto-sleep after 48h inactivity

### Upgrade Options:
- **Upgraded CPU**: $0.03/hour (4 CPU, 32GB RAM)
- **GPU (T4)**: $0.60/hour
- **GPU (A10G)**: $3.15/hour

---

## 🚀 Deployment Commands

```bash
# Full deployment workflow
huggingface-cli login
huggingface-cli repo create clinical-extractor --type space --space_sdk docker

git clone https://huggingface.co/spaces/your-username/clinical-extractor
cd clinical-extractor

# Copy project
cp -r /path/to/a_consulta/* .

# Create Dockerfile.huggingface (see above)
mv Dockerfile.huggingface Dockerfile

# Commit and push
git add .
git commit -m "feat: Initial Hugging Face Space deployment"
git push

# Your space will be live at:
# https://huggingface.co/spaces/your-username/clinical-extractor
```

---

## 🐳 Docker vs Gradio

### Use Docker SDK when:
- ✅ You need backend + frontend
- ✅ You want full control
- ✅ You have complex dependencies
- ✅ You need Nginx/multi-service

### Use Gradio SDK when:
- ✅ You want simple UI
- ✅ Quick prototyping
- ✅ Python-only backend
- ✅ Rapid iteration

---

## 🔒 Security Notes

**API Keys:**
- Add `GEMINI_API_KEY` as Repository Secret
- Never commit to git
- Secrets are encrypted at rest

**Private Spaces:**
- Upgrade to Pro ($9/month) for private spaces
- Hide space from public listing
- Restrict access with authentication

---

## 📚 Resources

- **Hugging Face Docs**: https://huggingface.co/docs/hub/spaces
- **Docker Spaces**: https://huggingface.co/docs/hub/spaces-sdks-docker
- **Gradio Docs**: https://gradio.app/docs/
- **Secrets Management**: https://huggingface.co/docs/hub/spaces-overview#managing-secrets

---

## 🎯 Example Spaces

Browse examples:
- https://huggingface.co/spaces (explore Docker spaces)
- https://huggingface.co/docs/hub/spaces-examples

---

**Last Updated**: November 19, 2025
**Status**: ✅ Ready for deployment
**Cost**: FREE (with optional upgrades)
