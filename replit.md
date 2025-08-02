# Email SaaS Application

## Overview

This project is a comprehensive email marketing SaaS platform. It enables users to manage email campaigns, handle recipient lists, integrate various email services, and leverage AI for personalized email content. The platform aims to provide a modern, efficient, and intelligent solution for businesses to conduct email outreach effectively, with capabilities spanning from warm-up functionality and deliverability checking to advanced AI personalization and campaign tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Authentication System**: Replit OAuth, secure manual user authentication with email verification and password reset, JWT-based admin authentication.
- **Email Management**: Multi-account SMTP/IMAP integration, automated warm-up system, email tracking (open/click).
- **Campaign System**: 4-step creation wizard, email rotation, automated follow-up sequences, scheduling, plan-based features.
- **AI Personalization**: Google Gemini integration for professional, research-based email content via website scraping and deep business analysis.
- **Payment Integration**: Stripe for subscription management with various plan tiers and usage tracking.
- **Instruction Boxes System**: Persistent, localStorage-based dismissal of setup guides and specific instructions.
- **Advanced Email Rotation System**: Configurable multi-account sending, timing controls, daily limits, and smart distribution.

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