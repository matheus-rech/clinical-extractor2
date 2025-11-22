#!/bin/bash
# =============================================================================
# AWS Lightsail Deployment Script
# =============================================================================
# Prerequisites:
#   1. AWS CLI installed: brew install awscli
#   2. Lightsail instance created: https://lightsail.aws.amazon.com/
#   3. SSH key pair configured
#   4. Docker installed on Lightsail instance
#
# Usage:
#   chmod +x lightsail-deploy.sh
#   ./lightsail-deploy.sh <lightsail-ip-address>
# =============================================================================

set -e  # Exit on error

# Check arguments
if [ -z "$1" ]; then
    echo "❌ Error: Lightsail IP address required"
    echo "Usage: ./lightsail-deploy.sh <lightsail-ip>"
    exit 1
fi

LIGHTSAIL_IP="$1"
LIGHTSAIL_USER="ubuntu"  # Default Lightsail user
SSH_KEY="${HOME}/.ssh/lightsail-key.pem"  # Update with your key path

echo "🚀 Deploying Clinical Extractor to AWS Lightsail..."
echo "📍 Target: ${LIGHTSAIL_USER}@${LIGHTSAIL_IP}"

# Step 1: Copy docker-compose.yml and .env
echo "📦 Step 1: Copying configuration files..."
scp -i "${SSH_KEY}" docker-compose.yml "${LIGHTSAIL_USER}@${LIGHTSAIL_IP}:~/clinical-extractor/"
scp -i "${SSH_KEY}" .env "${LIGHTSAIL_USER}@${LIGHTSAIL_IP}:~/clinical-extractor/"

# Step 2: Build Docker images
echo "🏗️  Step 2: Building Docker images..."
docker buildx build --platform linux/amd64 -t clinical-extractor-frontend:latest -f Dockerfile.frontend .
docker buildx build --platform linux/amd64 -t clinical-extractor-backend:latest -f backend/Dockerfile backend/

# Step 3: Save and transfer images
echo "💾 Step 3: Saving Docker images..."
docker save clinical-extractor-frontend:latest | gzip > frontend.tar.gz
docker save clinical-extractor-backend:latest | gzip > backend.tar.gz

echo "📤 Step 4: Transferring images to Lightsail..."
scp -i "${SSH_KEY}" frontend.tar.gz "${LIGHTSAIL_USER}@${LIGHTSAIL_IP}:~/clinical-extractor/"
scp -i "${SSH_KEY}" backend.tar.gz "${LIGHTSAIL_USER}@${LIGHTSAIL_IP}:~/clinical-extractor/"

# Step 5: Deploy on Lightsail
echo "🚢 Step 5: Deploying on Lightsail..."
ssh -i "${SSH_KEY}" "${LIGHTSAIL_USER}@${LIGHTSAIL_IP}" << 'EOF'
    cd ~/clinical-extractor

    # Load Docker images
    echo "📥 Loading Docker images..."
    docker load < frontend.tar.gz
    docker load < backend.tar.gz

    # Stop existing containers
    echo "🛑 Stopping existing containers..."
    docker-compose down || true

    # Start new containers
    echo "🚀 Starting containers..."
    docker-compose up -d

    # Show logs
    echo "📋 Container status:"
    docker-compose ps

    # Cleanup
    rm frontend.tar.gz backend.tar.gz

    echo "✅ Deployment complete!"
    echo "🌐 Frontend: http://$(curl -s ifconfig.me):3000"
    echo "🔧 Backend: http://$(curl -s ifconfig.me):8000"
EOF

# Cleanup local files
rm frontend.tar.gz backend.tar.gz

echo "✅ Deployment to AWS Lightsail complete!"
echo ""
echo "🔍 Next steps:"
echo "   1. Open AWS Lightsail console: https://lightsail.aws.amazon.com/"
echo "   2. Configure firewall rules (ports 3000, 8000, 80, 443)"
echo "   3. Set up static IP (Networking → Create static IP)"
echo "   4. Configure domain (optional): Route 53 → DNS records"
echo ""
echo "🌐 Access your app:"
echo "   Frontend: http://${LIGHTSAIL_IP}:3000"
echo "   Backend:  http://${LIGHTSAIL_IP}:8000/docs"
