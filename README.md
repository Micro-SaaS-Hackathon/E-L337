# E-L337 - AI-Powered Task Management Platform

# PPT IS IN CLIPPY(3).pdf

# in any case the link is https://pitch.com/v/clippy-q65wcs

An intelligent task management application built with Next.js, Supabase, and Google Gemini AI. This platform helps teams organize tasks, generate subtasks automatically, and collaborate efficiently with AI assistance.

## Features

- 🤖 **AI-Powered Task Generation** - Automatically generate tasks and subtasks using Google Gemini AI
- 👥 **Team Collaboration** - Create teams, assign tasks, and manage team members
- 📋 **Kanban Board** - Visual task management with drag-and-drop functionality
- 🏷️ **Smart Tagging** - Automatic task categorization and tagging
- 📅 **Team Calendar** - Schedule and track deadlines
- 💬 **AI Tech Stack Chat** - Get technical guidance and suggestions
- 🔐 **Authentication** - Secure user authentication with Supabase Auth

## Prerequisites

Before starting, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), [pnpm](https://pnpm.io/), or [bun](https://bun.sh/)
- A [Supabase](https://supabase.com/) account and project
- A [Google AI Studio](https://aistudio.google.com/) account for Gemini API access

## Environment Variables

Create a `.env.local` file in the root directory and add the following environment variables:

Environment keys were intentionally added to simplify and streamline database usage.

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://kdgigafrsyjoaeyzzlky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2lnYWZyc3lqb2FleXp6bGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTAwMTgsImV4cCI6MjA3MzA2NjAxOH0.hJRHQjcUCl5oWCZpOx4YbRjFJyrd8RFHbVQMbKU3THE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2lnYWZyc3lqb2FleXp6bGt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ5MDAxOCwiZXhwIjoyMDczMDY2MDE4fQ.bYnJWyb7iwsIHpnD09M6muCuL6LrdnOorbluDNeT7iE

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Optional: Site URL (for production deployments)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### How to get the environment variables:

#### Supabase Setup:

1. Go to [Supabase](https://supabase.com/) and create a new project
2. In your project dashboard, go to **Settings** > **API**
3. Copy the **Project URL** for `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon public** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the **service_role** key for `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)
6. Go to **SQL Editor** and run the database schema from `src/db/schema.sql`

#### Google Gemini AI Setup:

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the API key for `GEMINI_API_KEY`

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd e-l337
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Set up environment variables:**

   - Copy `.env.example` to `.env.local` (if available) or create a new `.env.local` file
   - Fill in all the required environment variables as described above

4. **Set up the database:**

   - Create a new Supabase project
   - Run the SQL schema from `src/db/schema.sql` in your Supabase SQL Editor
   - Make sure Row Level Security (RLS) is properly configured

5. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

6. **Open your browser:**
   Go to [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   └── onboarding/        # User onboarding
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature-specific components
├── db/                   # Database schema and migrations
├── lib/                  # Utility functions and configurations
└── types/                # TypeScript type definitions
```

## Key Technologies

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **AI:** Google Gemini AI (gemini-2.5-flash)
- **UI Components:** Radix UI, Lucide React
- **Drag & Drop:** @dnd-kit
- **Charts:** Recharts

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server

## Troubleshooting

### Common Issues:

1. **Missing environment variables:** Check that all required environment variables are set in `.env.local`
2. **Database connection issues:** Verify your Supabase credentials and network connection
3. **AI features not working:** Ensure your Gemini API key is valid and has sufficient quota
4. **Authentication issues:** Check your Supabase authentication settings and redirect URLs

### Development Tips:

- The application uses Turbopack for faster development builds
- Database changes should be made through Supabase migrations
- AI features require an active internet connection
- The app uses server-side rendering for better performance

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Learn about Supabase features
- [Google Gemini AI](https://ai.google.dev/) - Learn about Google's AI capabilities
- [Tailwind CSS](https://tailwindcss.com/docs) - Learn about utility-first CSS

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket)
2. Import your project to Vercel
3. Add all environment variables in the Vercel dashboard
4. Deploy!

Make sure to update the `NEXT_PUBLIC_SITE_URL` environment variable to your deployed URL.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
