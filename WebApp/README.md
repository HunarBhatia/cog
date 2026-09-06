# Cogniva - Senior Care Daily Companion

**Good Days, Brighter Tomorrows**

Cogniva is an enterprise-grade, accessible web application designed to support seniors with cognitive dignity, gentle routines, reminiscence activities, interactive memory games, and voice assistance.

---

## Technical Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v3 with custom design tokens
- **Icons**: Lucide React & Google Material Symbols Outlined
- **Speech Engine**: Web Speech API (Synthesis) & Bhasini Multilingual Engine integration
- **Typography**: Atkinson Hyperlegible Next, Playfair Display, Caveat

---

## Directory Structure

```
├── docs/
│   ├── ARCHITECTURE.md          # Technical Architecture & Accessibility Specs
│   └── integration-architecture.md # Voice Engine & Game Engine Endpoints Specification
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Global Root Layout (Mounts Global Voice Mascot)
│   │   ├── globals.css          # Global Tailwind & Custom Styles
│   │   ├── page.tsx             # Daily Companion Dashboard Route (/)
│   │   ├── sign-in/page.tsx     # Animated Persona Selection Route (/sign-in)
│   │   ├── folk/page.tsx        # Traditional Folk Heritage Route (/folk)
│   │   ├── arcade/page.tsx      # Arcade Games Hub Route (/arcade)
│   │   ├── arcade/game/page.tsx # Senior Memory Garden Game Route (/arcade/game)
│   │   └── game-arena/page.tsx  # Compatibility Redirect Route (/game-arena)
│   ├── components/
│   │   ├── layout/
│   │   │   └── Header.tsx       # Enterprise Navigation & Caregiver PIN Modal
│   │   ├── companion/
│   │   │   ├── RoutineSidebar.tsx    # Reminders, Streaks & Caregiver Emergency Trigger
│   │   │   ├── ActivityCarousel.tsx  # Reminiscence & Activity Dock
│   │   │   └── BhasiniBot.tsx        # Multilingual Voice Assistant Engine
│   │   ├── mascot/
│   │   │   ├── VoiceMascot.tsx       # Global Wake-Word & Voice Turn Orchestrator
│   │   │   ├── MascotStage.tsx       # Interactive Pip Mascot Stage
│   │   │   └── BhasiniBot.tsx        # Animated Mascot SVG State Machine
│   │   └── arcade/
│   │       ├── ArcadeView.tsx        # Games Hub View & Category Cards
│   │       └── MemoryGardenGame.tsx  # Flower Pairing Senior Game with Engine Hooks
│   ├── lib/
│   │   ├── speech.ts            # Web Speech API Synthesis Helper
│   │   └── integrations/        # Voice & Game Engine Integration Layer
│   │       ├── config.ts        # Wake phrases & endpoint configurations
│   │       ├── contracts.ts     # Request/Response TypeScript interfaces
│   │       ├── voiceEngineClient.ts # Voice turn adapter with local fallback
│   │       └── gameEngineClient.ts  # Game session launch & telemetry client
│   └── types/
│       └── companion.ts         # TypeScript Interfaces & Data Definitions
├── tailwind.config.js           # Design System Tokens
├── tsconfig.json                # Strict TypeScript Config
└── package.json                 # Project Manifest
```

---

## Voice & Game Engine Integration

1. **Global Voice Wake-Word (`blah blah`)**:
   - The entire web application continuously listens for the wake phrase `"blah blah"` (as well as `"hey cogniva"`, `"hello cogniva"`).
   - Upon wake word detection, the companion automatically activates, records audio chunks, and shows real-time speech transcription.
   - When speaking finishes, the voice turn payload (audio blob + transcript + session ID) is dispatched to `POST /v1/voice/turn`.
   - The companion speaks back the reply via TTS or direct audio URL.

2. **Game Engine Auto-Redirect**:
   - If the Voice Engine response contains an intent or `gameCommand.action === "START_GAME"`, the frontend queries `POST /v1/game/session` to obtain a session and dynamically redirects to `/arcade/game?gameId=...&gameSession=...&autostart=1`.

3. **Endpoints Configuration**:
   - Copy `.env.example` to `.env.local` to specify external service endpoints:
   ```env
   NEXT_PUBLIC_VOICE_TURN_ENDPOINT=https://your-voice-engine.com/v1/voice/turn
   NEXT_PUBLIC_GAME_LAUNCH_ENDPOINT=https://your-game-engine.com/v1/game/session
   NEXT_PUBLIC_GAME_EVENTS_ENDPOINT=https://your-game-engine.com/v1/game/events
   ```
   - If environment variables are omitted, resilient local mock fallbacks are used.

---

## Key Features

1. **Gentle Routine & Audio Reminders**:
   - Spoken notifications with Web Speech API (`speakAnnouncement`).
   - Emergency caregiver instant call trigger.

2. **Caregiver PIN Lock**:
   - Secure numeric keypad modal protecting routine configuration.

3. **Interactive Pip Mascot**:
   - Tap-responsive otter mascot providing warm, reassuring daily speech bubbles.

4. **Senior-Friendly Memory Game Arena**:
   - 4x4 floral pair matching with zero time constraints and clear visual feedback.

5. **Multilingual Assistant (Bhasini Engine)**:
   - Voice assistant supporting English, Hindi, Tamil, Telugu, Bengali, and Marathi.

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Access the application locally at `http://localhost:3000`.

