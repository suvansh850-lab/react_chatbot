# Morepen AI Analyst Chatbot

A secure, internal AI analyst chatbot application for Morepen employees. Built with **React (Vite)** on the frontend, **Node.js (Express)** on the backend, and **Supabase (PostgreSQL & Authentication)**.

## Project Structure

This is a monorepo consisting of:
- **/frontend**: React + Vite single-page application.
- **/backend**: Node.js + Express REST API server communicating with Supabase PostgreSQL.

---

## Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Setting Up Environment Variables
Environment variables must be configured before running the applications. 

#### Backend Setup (`/backend`)
1. Navigate to `/backend`.
2. Copy `.env.example` to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your connection credentials and API keys:
   - `GROQ_API_KEY`: Your API key for Groq AI.
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Your database credentials (e.g. from Supabase connection pooler).

#### Frontend Setup (`/frontend`)
1. Navigate to `/frontend`.
2. Copy `.env.example` to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your Supabase variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous API key.
   - `VITE_API_KEY`: API authentication key.

---

## Running Locally

To run both services simultaneously:

### Run Backend Server
1. Navigate to `/backend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *(Running by default on `http://localhost:5000`)*

### Run Frontend Client
1. Navigate to `/frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *(Running by default on `http://localhost:5173`)*

---

## Deployment

- **Frontend**: Deploy static assets (built via `npm run build` from `/frontend`) to **Vercel** or **Netlify**. Ensure you register the production domain in your Supabase **URL Configuration** redirects list.
- **Backend**: Deploy the server to **Render** or **Railway**.
- **Database**: Already cloud-hosted on Supabase.
