# Email SaaS Application

A comprehensive AI-powered email marketing platform with advanced personalization, warmup systems, and campaign management.

## Features

- 🤖 **AI-Powered Personalization** - Generate personalized emails using Gemini AI
- 📧 **Email Warmup System** - Automated warmup with IMAP monitoring
- 🎯 **Campaign Management** - Multi-step campaign creation with scheduling
- 🔄 **Email Rotation** - Send from multiple accounts with smart distribution
- 📊 **Analytics Dashboard** - Real-time tracking and reporting
- 💳 **Subscription Plans** - Stripe-integrated billing system
- 🔒 **Dual Authentication** - Google OAuth + Manual auth with email verification

## Quick Start

### Running Locally

1. **Clone and Install**
```bash
git clone <your-repo-url>
cd email-saas-app
npm install
```

2. **Setup Environment**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

3. **Database Setup**
```bash
# Make sure PostgreSQL is running
# Create database: email_saas_db
npm run db:push
```

4. **Start Development Server**
```bash
npm run dev
# App available at http://localhost:5000
```

### Production Deployment

Use our automated deployment script:

```bash
# Make executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production
```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

### Optional (for full functionality)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GEMINI_API_KEY` - AI personalization
- `STRIPE_SECRET_KEY` & `VITE_STRIPE_PUBLIC_KEY` - Payments
- `OPENAI_API_KEY` - Alternative AI service

## API Endpoints

- `GET /health` - Health check
- `GET /api/auth/user` - Get current user
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/recipients` - List recipients
- `GET /api/warmup/stats` - Warmup statistics

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit OAuth + Manual JWT
- **AI**: Google Gemini + OpenAI
- **Payments**: Stripe
- **Email**: Custom SMTP + Python sender

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run database migrations
npm run db:push

# View database
npm run db:studio
```

## Docker Deployment (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t email-saas-app .
docker run -p 3000:3000 email-saas-app
```

## Support

For deployment issues, check:
1. Environment variables are set correctly
2. Database is accessible
3. All required services are running
4. Check logs: `pm2 logs` or application console

## License

MIT License - see LICENSE file for details.