# Email SaaS Application

## Overview

This is a comprehensive email marketing SaaS platform built with a full-stack TypeScript architecture. The application provides email campaign management, recipient list handling, email integration, warm-up functionality, deliverability checking, and AI-powered email personalization. It features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Text Editor Improvements (July 19, 2025)
- Replaced complex rich text editor with simple textarea to fix text reversal bug
- Added HTML tag buttons for Bold, New Line, Headings (H1-H3), and Link insertion
- Added dynamic field buttons for recipient personalization ({{name}}, {{email}}, etc.)
- Users can now type normally without text appearing backward
- Text editor now supports HTML formatting with clickable buttons

### Campaign Management Enhancements (July 19, 2025)
- Added trash icon and delete functionality to campaigns list
- Enhanced follow-up email system with direct storage in campaigns table
- Updated database schema to include followUpEnabled, followUpSubject, followUpBody fields
- Fixed follow-up display logic in campaign detail modal
- Added ability to edit follow-up delay time (1-30 days) in campaign details
- Added follow-up condition editing (Not Opened, Not Clicked, Opened but Not Clicked)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with development optimizations

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OAuth integration with session management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: Shared between client and server (`/shared/schema.ts`)
- **Migrations**: Managed through Drizzle Kit
- **Connection**: Neon Database serverless with WebSocket support

## Key Components

### Authentication System
- **Provider**: Replit OAuth with OpenID Connect
- **Session Management**: Express sessions stored in PostgreSQL
- **User Model**: Stores profile information, plan details, and Stripe integration
- **Authorization**: Route-level protection with authentication middleware

### Email Management
- **SMTP/IMAP Integration**: Multi-account email service configuration
- **Validation**: Automatic connection testing for email accounts
- **Warm-up System**: Automated email reputation building
- **Service Layer**: Nodemailer for SMTP, IMAP library for inbox management

### Campaign System
- **4-Step Campaign Creation**: Full-page wizard flow (Campaign Info → Recipients → Content → Sending Settings)
- **Email Rotation**: Multi-account email distribution for upgraded plans
- **Follow-up Sequences**: Automated follow-up email chains with condition-based triggers
- **AI Enhancement**: OpenAI-powered email content improvement
- **Scheduling**: Time-based campaign execution with configurable sending windows
- **Tracking**: Email delivery and engagement metrics
- **Plan-Based Features**: Different capabilities based on subscription tier

### AI Personalization
- **Provider**: OpenAI GPT-4o integration
- **Website Scraping**: Automated content extraction for personalization
- **Template Generation**: AI-powered email content creation
- **Customization**: Tone, length, and CTA configuration

### Payment Integration
- **Provider**: Stripe for subscription management
- **Plan Tiers**: Demo (free), Starter, Pro, Premium with usage limits
- **Webhooks**: Automated plan updates and billing events
- **Usage Tracking**: Real-time monitoring of plan limits

### Instruction Boxes System
- **Persistent Dismissal**: Instruction boxes show only on first visit to each page
- **localStorage Storage**: Dismissed instructions are stored locally and won't reappear
- **Provider-Specific Instructions**: Email integration forms show OAuth for Gmail, SMTP/IMAP instructions for other providers
- **Setup Guides**: Each provider includes links to official documentation for SMTP/IMAP setup
- **Reset Capability**: Users can reset instruction visibility through the useInstructions hook

### Enhanced Personalization System
- **Quota Tracking**: Visual cards showing remaining/used personalization quotas per plan
- **Individual Personalization**: Single recipient personalization via action menu
- **Bulk Processing**: "Personalize All" functionality with progress tracking
- **Settings Configuration**: Required personalization settings (email type, tone, CTA, character limits)
- **Export Functionality**: CSV download with all personalized emails
- **Website Validation**: Recipients without websites show "No Website" status
- **Plan-Based Limits**: Demo (30), Starter (1000), Pro (1000), Premium (1000) personalizations

### Advanced Email Rotation System
- **Multi-Account Sending**: Upgraded plans can rotate emails across multiple verified email accounts
- **Configurable Rotation**: Users set emails per account before switching (default: 30 emails)
- **Timing Controls**: Customizable delay between email sends (1-60 minutes)
- **Daily Limits**: Plan-based sending limits with automatic daily scheduling
- **Time Windows**: Configurable sending hours (e.g., 8 AM to 5 PM)
- **Smart Distribution**: Automatic calculation of email distribution across accounts and days
- **Completion Estimates**: Real-time estimation of campaign completion time
- **Account Validation**: Verification that all rotation accounts are properly configured

## Data Flow

### User Authentication Flow
1. User initiates login through Replit OAuth
2. OpenID Connect authentication with Replit
3. Session creation and user profile synchronization
4. Persistent session storage in PostgreSQL

### Email Campaign Flow
1. User creates recipient lists with CSV import capability
2. Email integration setup with SMTP/IMAP validation
3. Campaign creation with personalization options
4. AI-powered content generation using website data
5. Scheduled or immediate campaign execution
6. Real-time delivery tracking and analytics

### Plan Management Flow
1. User selects plan upgrade
2. Stripe Checkout session creation
3. Payment processing and webhook handling
4. Automatic plan activation and limit updates
5. Usage tracking against plan boundaries

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **Replit OAuth**: Authentication provider
- **OpenAI**: AI-powered email personalization
- **Stripe**: Payment processing and subscription management

### Email Services
- **SMTP Providers**: Support for major email providers (Gmail, Outlook, custom)
- **IMAP Access**: Inbox monitoring and email verification
- **Nodemailer**: Email sending infrastructure

### Development Tools
- **Replit Integration**: Development environment optimization
- **Vite Plugins**: Hot module replacement and development tooling
- **TypeScript**: Full-stack type safety

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite development server with React Fast Refresh
- **API Development**: Express server with TypeScript compilation
- **Database**: Replit-provisioned PostgreSQL instance
- **Environment Variables**: Replit Secrets management

### Production Build
- **Frontend**: Vite production build with static asset optimization
- **Backend**: ESBuild compilation for Node.js deployment
- **Database Migrations**: Drizzle Kit automated schema updates
- **Static Serving**: Express static file serving for SPA

### Configuration Management
- **Environment Variables**: Database URLs, API keys, OAuth credentials
- **Feature Flags**: Plan-based feature availability
- **CORS**: Configured for Replit domain handling
- **Session Security**: Secure cookies with domain restrictions

### Monitoring and Analytics
- **Usage Tracking**: Real-time plan limit monitoring
- **Error Handling**: Centralized error management with user feedback
- **Performance**: Query optimization and connection pooling
- **Logging**: Request/response logging for API endpoints

The application implements a modern SaaS architecture with clear separation of concerns, robust authentication, and scalable data management suitable for email marketing operations.