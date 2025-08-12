#!/bin/bash

# Email SaaS Application Deployment Script
# Usage: ./deploy.sh [local|production]

set -e

MODE=${1:-local}

echo "🚀 Starting deployment in $MODE mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 first."
    print_warning "On Ubuntu/Debian: sudo apt install python3"
    print_warning "On macOS: brew install python3"
    exit 1
fi

if [ "$MODE" == "local" ]; then
    echo "📦 Setting up local development environment..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating template..."
        cat > .env << EOL
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/email_saas_db

# Authentication
SESSION_SECRET=your-super-secret-session-key-here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Payment Processing
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
VITE_STRIPE_PUBLIC_KEY=pk_test_your-stripe-public-key

# Development
NODE_ENV=development
PORT=5000
EOL
        print_warning "Please update the .env file with your actual values before running the app."
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Check if PostgreSQL is running
    if command -v pg_isready &> /dev/null; then
        if pg_isready -q; then
            print_status "PostgreSQL is running"
        else
            print_warning "PostgreSQL is not running. Please start PostgreSQL service."
        fi
    else
        print_warning "PostgreSQL tools not found. Make sure PostgreSQL is installed and running."
    fi
    
    # Run database migrations
    print_status "Setting up database..."
    npm run db:push || print_warning "Database push failed. Make sure your DATABASE_URL is correct."
    
    # Test Python email sender
    print_status "Testing Python email sender..."
    if python3 server/email_sender.py --help &> /dev/null; then
        print_status "Python email sender is working correctly"
    else
        print_warning "Python email sender test failed. Check Python installation."
    fi
    
    print_status "Local development setup complete!"
    echo ""
    echo "To start the application:"
    echo "  npm run dev"
    echo ""
    echo "The app will be available at: http://localhost:5000"
    echo ""
    print_status "Requirements verified:"
    echo "  ✓ Node.js $(node --version)"
    echo "  ✓ npm $(npm --version)"
    echo "  ✓ Python $(python3 --version)"

elif [ "$MODE" == "production" ]; then
    echo "🏭 Setting up production environment..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
    fi
    
    # Check if .env.production file exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production file not found. Creating template..."
        cat > .env.production << EOL
# Database
DATABASE_URL=postgresql://emailapp:your-db-password@localhost:5432/email_saas_production

# Security
SESSION_SECRET=your-ultra-secure-session-secret-for-production
NODE_ENV=production
PORT=3000

# Your production API keys
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GEMINI_API_KEY=your-production-gemini-api-key
STRIPE_SECRET_KEY=sk_live_your-production-stripe-secret
VITE_STRIPE_PUBLIC_KEY=pk_live_your-production-stripe-public

# Production domain
REPLIT_DOMAINS=yourdomain.com
EOL
        print_warning "Please update the .env.production file with your actual production values."
        exit 1
    fi
    
    # Install production dependencies
    print_status "Installing production dependencies..."
    npm ci --production
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    # Run database migrations
    print_status "Setting up production database..."
    NODE_ENV=production npm run db:push
    
    # Create logs directory
    mkdir -p logs
    
    # Start with PM2
    print_status "Starting application with PM2..."
    
    # Load environment variables from .env.production
    export $(cat .env.production | xargs)
    
    # Start the application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    
    print_status "Production deployment complete!"
    echo ""
    echo "Application is running with PM2. Use these commands to manage it:"
    echo "  pm2 status           - Check app status"
    echo "  pm2 logs             - View logs"
    echo "  pm2 restart email-saas-app - Restart app"
    echo "  pm2 stop email-saas-app    - Stop app"
    echo ""
    echo "App is running on port 3000. Configure your reverse proxy (Nginx) to point to it."

else
    print_error "Invalid mode. Use: ./deploy.sh [local|production]"
    exit 1
fi

echo ""
print_status "Deployment completed successfully! 🎉"