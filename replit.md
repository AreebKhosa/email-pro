# Email SaaS Application

## Overview

This project is a comprehensive email marketing SaaS platform. It enables users to manage email campaigns, handle recipient lists, integrate various email services, and leverage AI for personalized email content. The platform aims to provide a modern, efficient, and intelligent solution for businesses to conduct email outreach effectively, with capabilities spanning from warm-up functionality and deliverability checking to advanced AI personalization and campaign tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 11, 2025)

- ✅ **Migration Complete**: Successfully migrated from Replit Agent to standard Replit environment
- ✅ **Database Setup**: PostgreSQL database created and all tables pushed using Drizzle schema
- ✅ **SMTP Configuration**: Email verification system fully configured with environment variables
- ✅ **Session Management**: Fixed session secret configuration for proper authentication
- ✅ **Email Verification**: Both signup verification and login verification codes working properly
- ✅ **Environment Variables**: All SMTP credentials (HOST, PORT, USER, PASS, FROM_EMAIL, FROM_NAME) configured
- ✅ **Email System Fixed**: Corrected SMTP environment variable references and email authentication flows
- ✅ **Code Optimization**: Created helper functions for SMTP configuration and validation
- ✅ **Password Reset**: Fixed forgot password email sending with proper SMTP configuration
- ✅ **SMTP Helper Functions**: Created `getSmtpConfig()` and `isSmtpConfigured()` for centralized email configuration
- ✅ **Environment Variable Fix**: Fixed all references from `SMTP_FROM_EMAIL` to `FROM_EMAIL` for proper email sending

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OAuth integration with session management
- **Session Storage**: PostgreSQL-backed sessions

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: Shared between client and server (`/shared/schema.ts`)
- **Migrations**: Managed through Drizzle Kit
- **Connection**: Neon Database serverless

### Key Features
- **Authentication System**: Replit OAuth, secure manual user authentication with email verification and password reset via SMTP emails, JWT-based admin authentication, complete forgot password flow.
- **Email Management**: Multi-account SMTP/IMAP integration, automated warm-up system, email tracking (open/click).
- **Campaign System**: 4-step creation wizard, email rotation, automated follow-up sequences, scheduling, plan-based features with progress tracking.
- **AI Personalization**: Google Gemini integration for professional, research-based email content via website scraping and deep business analysis.
- **Payment Integration**: Stripe for subscription management with various plan tiers and usage tracking.
- **Profile Management**: Complete user profile system with profile picture upload using object storage, first/last name editing.
- **Object Storage Integration**: Secure file upload system for profile pictures with ACL-based access control.
- **Real-time Usage Tracking**: Accurate billing and usage metrics display based on actual user plan limits and consumption.
- **Instruction Boxes System**: Persistent, localStorage-based dismissal of setup guides and specific instructions.
- **Advanced Email Rotation System**: Configurable multi-account sending, timing controls, daily limits, and smart distribution.
- **Plan-Based Feature Limitations**: Starter plan limited to 1 follow-up sequence and 10 email warm-up; Premium plan allows 2 follow-up sequences.
- **Simplified Configuration**: All API keys and SMTP settings now use environment variables only for easier local development (updated January 10, 2025).
- **Complete Password Reset Flow**: Forgot password functionality with email links, secure token validation, and password update screens (added January 10, 2025).

## Deployment & Infrastructure

### Deployment Options
- **Local Development**: Direct npm run with hot reload
- **VPS/Server**: PM2 + Nginx reverse proxy with SSL
- **Docker**: Containerized deployment with docker-compose
- **Automated**: Shell script for streamlined setup

### Production Setup
- **Process Management**: PM2 for Node.js process handling
- **Reverse Proxy**: Nginx with SSL termination
- **Database**: PostgreSQL with connection pooling
- **Monitoring**: Health check endpoints and logging
- **Security**: SSL certificates, session security, environment isolation

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting
- **Replit OAuth**: Authentication provider
- **Google Gemini**: AI-powered email personalization
- **Stripe**: Payment processing and subscription management

### Email Services
- **SMTP Providers**: Support for major email providers (Gmail, Outlook, custom)
- **IMAP Access**: Inbox monitoring and email verification
- **Python SMTP Script**: Used for reliable email sending

### Development Tools
- **Replit Integration**: Development environment optimization
- **Vite**: Frontend build tool
- **TypeScript**: Full-stack type safety