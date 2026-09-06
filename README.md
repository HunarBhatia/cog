# Cogniva — AI-Based Cognitive Gaming and Memory Assistance Platform

**Problem Statement:** AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER), for MDoNER (SIH 2026).

---

## Architecture Overview

Cogniva is built as an integrated multi-tier platform:

```
SIH-Proto/
├── WebApp/                  # Next.js 14 Web Application (Port 3000)
│   ├── src/app/             # Sanctuary, Memory Garden, Caregiver Dashboard, Sign In
│   ├── src/components/      # Mascot Stage, Rive Animated BhasiniBot, Voice Mascot
│   └── src/lib/             # Auth client, Dashboard client, Game & Voice engine clients
├── Cogniva-Voice-Agent/     # FastAPI Conversational Voice Agent (Port 8001)
│   ├── supervisor.py        # LangGraph Supervisor Agent (Groq / Llama / OSS Models)
│   ├── nodes/               # Whisper STT & Edge-TTS Multi-Lingual Speech Synthesis
│   ├── tools/               # Memory extraction, Reminders, and Game Router tools
│   └── server.py            # Async REST voice pipeline with continuous listening
├── Cogniva-Backend/         # Django REST API Backend (Port 8000)
│   ├── accounts/            # JWT Auth, Patient Profiles, Game Logs, Reminders, Memories
│   └── cogniva_backend/     # Settings, CORS configuration, PostgreSQL integration
└── ssh-2026/                # Cognitive ability tracking & state models
```

---

## Key Features

1. **Multilingual Voice Companion (BhasiniBot / Orson & Merv)**:
   - Live conversational AI with dynamic language detection (Hindi, English, Bengali, Nepali, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Urdu).
   - Real-time Edge-TTS neural speech synthesis matching the exact language spoken by the user.
   - Continuous turn-taking: automatically re-arms the microphone after speaking for natural conversation.
   - Global wake phrase listener (*"Hey Orson"*, *"Namaste"*, *"Hey Cogniva"*).

2. **Cognitive Exercise & Memory Garden**:
   - Pair matching cognitive game with dynamic difficulty.
   - Automated score logging to Django backend via JWT authentication.
   - Voice-driven game launch (*"I want to play a game"* routes directly to the arcade).

3. **Caregiver Dashboard**:
   - Real-time display of patient memory facts extracted by the voice agent.
   - Medication and routine reminders with voice readout.
   - Cognitive score trends and history tracking.

---

## Quick Start Guide

### 1. Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Groq API Key

### 2. Django Backend Setup (Port 8000)
```bash
cd Cogniva-Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 3. FastAPI Voice Agent Setup (Port 8001)
```bash
cd Cogniva-Voice-Agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### 4. Next.js WebApp Setup (Port 3000)
```bash
cd WebApp
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
