# Email SaaS Application Deployment Guide

## Table of Contents
1. [Running Locally](#running-locally)
2. [VPS/Server Deployment](#vpsserver-deployment)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Domain & SSL Configuration](#domain--ssl-configuration)
6. [Production Considerations](#production-considerations)

## Running Locally

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or remote)
- Python 3.8+ (for email sending)

### Step 1: Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd email-saas-app
npm install
```

### Step 2: Environment Variables
Create a `.env` file in the root directory:
```env
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

# Object Storage (if using file uploads)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
PRIVATE_OBJECT_DIR=/your-bucket/private
PUBLIC_OBJECT_SEARCH_PATHS=/your-bucket/public

# Development
NODE_ENV=development
PORT=5000
```

### Step 3: Database Setup
```bash
# Create PostgreSQL database
createdb email_saas_db

# Push database schema
npm run db:push
```

### Step 4: Run the Application
```bash
# Development mode with hot reload
npm run dev

# The app will be available at http://localhost:5000
```

## VPS/Server Deployment

### Step 1: Server Setup (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Python 3 and pip
sudo apt install python3 python3-pip -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

### Step 2: Create Application User
```bash
# Create dedicated user for the app
sudo adduser emailapp --disabled-password --gecos ""

# Switch to app user
sudo su - emailapp

# Create app directory
mkdir ~/email-saas-app
cd ~/email-saas-app
```

### Step 3: Database Setup on Server
```bash
# Switch to postgres user
sudo su - postgres

# Create database and user
createdb email_saas_production
createuser emailapp --pwprompt

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE email_saas_production TO emailapp;"
```

### Step 4: Deploy Application Code
```bash
# As emailapp user
cd ~/email-saas-app

# Clone your repository
git clone <your-repo-url> .

# Install dependencies
npm ci --production

# Build the application
npm run build
```

### Step 5: Production Environment Variables
Create `.env.production` file:
```env
# Database
DATABASE_URL=postgresql://emailapp:your-db-password@localhost:5432/email_saas_production

# Security
SESSION_SECRET=your-ultra-secure-session-secret-for-production
NODE_ENV=production
PORT=3000

# Your API keys and configurations (same as local but production values)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GEMINI_API_KEY=your-production-gemini-api-key
STRIPE_SECRET_KEY=sk_live_your-production-stripe-secret
VITE_STRIPE_PUBLIC_KEY=pk_live_your-production-stripe-public

# Production domain
REPLIT_DOMAINS=yourdomain.com
```

### Step 6: Database Migration
```bash
# Push database schema to production
NODE_ENV=production npm run db:push
```

### Step 7: PM2 Process Management
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'email-saas-app',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production'
  }]
};
```

Start the application:
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u emailapp --hp /home/emailapp
```

### Step 8: Nginx Configuration
Create `/etc/nginx/sites-available/email-saas-app`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/email-saas-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Environment Variables

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for session encryption
- `NODE_ENV`: Set to 'production' for production

### Optional but Recommended
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `GEMINI_API_KEY`: For AI-powered email personalization
- `STRIPE_SECRET_KEY` & `VITE_STRIPE_PUBLIC_KEY`: For payments
- `OPENAI_API_KEY`: Alternative AI service
- Object storage variables for file uploads

## Database Setup

### Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb email_saas_db

# Create user
sudo -u postgres createuser --interactive
```

### Cloud Database Options
1. **Neon Database** (Recommended for development)
2. **AWS RDS PostgreSQL**
3. **Google Cloud SQL**
4. **DigitalOcean Managed Database**

## Domain & SSL Configuration

### DNS Records
Point your domain to your server IP:
```
A Record: @ -> YOUR_SERVER_IP
A Record: www -> YOUR_SERVER_IP
```

### SSL Certificate
Using Let's Encrypt (free):
```bash
sudo certbot --nginx -d yourdomain.com
```

## Production Considerations

### Security
- Use strong passwords and API keys
- Keep dependencies updated
- Configure firewall (UFW)
- Regular backups
- Monitor logs

### Performance
- Enable Nginx gzip compression
- Use Redis for session storage (optional)
- Monitor resource usage
- Scale horizontally if needed

### Monitoring
```bash
# Check application status
pm2 status

# View logs
pm2 logs email-saas-app

# Monitor resources
pm2 monit
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
pg_dump email_saas_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Updates
```bash
# Update application
cd ~/email-saas-app
git pull origin main
npm ci --production
pm2 restart email-saas-app
```

## Troubleshooting

### Common Issues
1. **Port already in use**: Change PORT in environment
2. **Database connection failed**: Check DATABASE_URL
3. **Permission denied**: Check file permissions
4. **Nginx 502 error**: Ensure app is running on correct port

### Logs
```bash
# Application logs
pm2 logs email-saas-app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx
```

For additional support, check the application logs and ensure all environment variables are correctly configured.