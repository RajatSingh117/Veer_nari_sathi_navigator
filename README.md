# Veer Nari Saathi - Armed Forces Family Navigator

A web app that helps widows and families of fallen Indian soldiers discover the benefits they are entitled to, understand the paperwork, and get a ready-to-edit application letter.

## Features
- **Guidance Questionnaire:** Determines potential entitlements.
- **AI Document Extraction:** Upload service records or ID proofs and have fields automatically extracted via Gemini Vision.
- **Entitlement Matching:** AI selects applicable benefits based on extracted data against a verified knowledge base.
- **Letter Drafting:** Automatically drafts formal application letters in English, Hindi, or Marathi.
- **Checklist Tracking:** Built-in task tracking for application procedures.

## Setup & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` to view the app.

## Build for Production
```bash
npm run build
npm run start
```
