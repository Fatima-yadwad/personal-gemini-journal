# Personal Gemini Journal

A production-ready, secure, and empathetic personal reflection web application powered by **Google Gemini** and **Firebase Authentication / Cloud Firestore**.

---

## 🌟 Original Feature: AI Mood & Insight Dashboard

The **AI Mood & Insight Dashboard** allows users to extract emotional, thematic, and practical clarity from their reflective writing without clinical diagnosis:
- **Identified Mood & Energy Dial**: Synthesizes emotional states (e.g., *"Creative Spark"*, *"Constructive Uncertainty"*, *"Quiet Gratitude"*) and rates optimism/energy on a 1–10 scale.
- **Thematic Tagging**: Automatically tags recurring life areas (e.g., `#Work-Life Harmony`, `#Mindful Pauses`).
- **Core Synthesis & Meaning**: Provides an empathetic 2-sentence distillation of the journal session.
- **Helpful Insight**: Pinpoints underlying perspective shifts or cognitive insights.
- **Suggested Micro-Action**: Generates a 1-step practical daily action to build momentum.
- **Historical Timeline**: Visualizes mood patterns, recurring themes, and past wisdom over time.

---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Client (React 19 + Vite)               │
│ - Firebase Auth (Google Sign-In, Passwordless)           │
│ - Cloud Firestore SDK (Direct encrypted RPC)             │
│ - Zero Gemini API Keys in Browser Bundle                 │
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
               │ (Google OAuth Tokens)     │ (Owner-Bound /users/{uid}/*)
               ▼                           ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│   Firebase Authentication     │  │      Cloud Firestore Database     │
│   - Federated Identity        │  │      - /users/{uid}/sessions      │
│   - Passwordless security     │  │      - /users/{uid}/insights      │
└───────────────────────────────┘  └───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│         Backend Service API (Node.js / Express)          │
│ - POST /api/journal/chat    (Multi-turn reflection)      │
│ - POST /api/journal/analyze (Structured Mood/Insight)    │
│ - Resilient Model Fallback Ladder                        │
│   gemini-3.6-flash ➔ gemini-3.1-flash-lite ➔ latest      │
│ - Secret Manager / Secure Env (GEMINI_API_KEY)           │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │    Google Gemini GenAI API    │
               └───────────────────────────────┘
```

---

## 🛡️ Agentic Threat Model & Security Considerations

| Threat Zone | Identified Vector | Defense & Mitigation |
|---|---|---|
| **Input Surfaces** | Malicious payloads or prompt overrides | Strict schema validation, character limits, defensive destructuring guards. |
| **Planning & Reasoning** | Prompt injection seeking clinical diagnoses | System instructions enforcing non-clinical reflective boundaries; structured typed schema. |
| **Tool Execution** | API Key exposure in browser | Backend proxy layer; `GEMINI_API_KEY` is never exposed or prefixed with `VITE_`. |
| **Memory & State** | Cross-user data leakage in Firestore | Strict owner-bound paths (`/users/{uid}/*`) and declarative security rules (`request.auth.uid == userId`). |
| **Inter-System / Auth** | Password stuffing or spoofing | Passwordless Google Federated Auth via Firebase; zero custom password storage. |

---

## 🔒 Firestore Security Rules

Deployed in `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /sessions/{sessionId} {
        allow read, create, update, delete: if isOwner(userId);
      }

      match /insights/{insightId} {
        allow read, create, update, delete: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ⚙️ Google Cloud Secret Manager Setup

```bash
# 1. Set default project to personal-gemini-journal-507006
gcloud config set project personal-gemini-journal-507006

# 2. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --project=personal-gemini-journal-507006 --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --project=personal-gemini-journal-507006 --data-file=-

# 3. Grant the Cloud Run runtime service account permission to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --project=personal-gemini-journal-507006 \
  --member="serviceAccount:332003361853-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Cloud Run Deployment Flow

```bash
# 1. Build and deploy to Google Cloud Run targeting personal-gemini-journal-507006
gcloud run deploy personal-gemini-journal \
  --project=personal-gemini-journal-507006 \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest

# 2. Apply campaign verification label
gcloud run services update personal-gemini-journal \
  --project=personal-gemini-journal-507006 \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 💻 Local Development Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY in .env
   ```
3. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🧪 Comprehensive Manual Testing Checklist

| Test ID | Scenario | Expected Outcome |
|---|---|---|
| **TC-01** | Google Sign-In | Clicking "Sign In with Google" triggers Firebase popup and navigates to the private dashboard upon completion. |
| **TC-02** | Sign Out | Clicking "Sign Out" clears session state and redirects to the landing page. |
| **TC-03** | Multi-Turn Reflection | Submitting thoughts generates empathetic responses with context preserved across message turns. |
| **TC-04** | AI Mood & Insight Analysis | Clicking "Generate AI Insights" outputs Mood, Energy Dial, Themes, Synthesis, Insight, and Next Action. |
| **TC-05** | Firestore Session Persistence | Session and messages are automatically saved under `/users/{uid}/sessions/{sessionId}`. |
| **TC-06** | Journal History & Search | Historical sessions list with timestamps, summaries, and search filter works accurately. |
| **TC-07** | Owner Data Isolation | A user cannot read or query documents belonging to any other `userId`. |
| **TC-08** | Error Handling & Retry | Simulated offline or missing API key displays actionable alert banners without application crashes. |
