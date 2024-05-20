# AI Freelancing Platform

## Introduction

This AI-powered platform abstracts all the complexity that comes with dealing with freelancers through an LLM Agent.

## Technology Stack

-   **Frontend:** TypeScript & Tailwind CSS with Shadcn UI library
-   **Backend:** Node & Supabase
-   **Database:** Postgres

## Project Setup

Follow these steps to it set up on your local development environment.

### Backend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd ai-freelance-BE

# Install npm packages
npm install

# Set up environment variables
echo "SUPABASE_KEY=[paste supabase api key here]" > .env
echo "SUPABASE_URL=[paste supabase URL here]" >> .env
echo "OPENAI_ORG_ID=[paste openai org id here]" >> .env
echo "OPENAI_PROJECT_ID=[paste openai proj id here]" >> .env
echo "OPENAI_API_KEY=[paste openai api key here]" >> .env

# Start the backend development server
nodemon ./server.js
```