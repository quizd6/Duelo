# Duelo - PRD (Product Requirements Document)

## Original Problem Statement
Application mobile quiz "Duelo" inspirée de "Quiz Up". L'app supporte une hiérarchie de données à 3 niveaux : Super Catégorie → Cluster → Thème, avec import de données CSV.

## Tech Stack
- **Frontend**: Expo (React Native) avec Expo Router (file-based routing)
- **Backend**: FastAPI (Python) avec SQLAlchemy ORM
- **Database**: PostgreSQL (via Supabase)
- **Data Import**: asyncpg pour bulk COPY CSV → PostgreSQL

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI + SQLAlchemy models + all API endpoints
│   └── static/            # Static assets (fond_duelo.webp)
└── frontend/
    ├── app/
    │   ├── _layout.tsx          # Root layout with cosmic background injection
    │   ├── +html.tsx            # Custom HTML template for web
    │   ├── index.tsx            # Login / Guest entry
    │   ├── (tabs)/
    │   │   ├── _layout.tsx      # Tab Navigator with glass footer
    │   │   ├── accueil.tsx      # Feed / Activity tab
    │   │   ├── home.tsx         # "Jouer" tab - Super Categories
    │   │   ├── themes.tsx       # Themes exploration
    │   │   ├── players.tsx      # Social / Messages
    │   │   ├── profile.tsx      # User profile
    │   │   └── leaderboard.tsx  # Leaderboard
    │   ├── super-category.tsx   # Super Category detail
    │   ├── category-detail.tsx  # Theme detail page
    │   ├── matchmaking.tsx      # Matchmaking screen
    │   ├── game.tsx             # Quiz gameplay
    │   ├── results.tsx          # Quiz results
    │   ├── chat.tsx             # Chat
    │   ├── search.tsx           # Search
    │   └── player-profile.tsx   # Player profile view
    ├── theme/
    │   └── glassTheme.ts        # Glassmorphism design tokens
    ├── components/
    │   ├── DueloHeader.tsx      # Glass header with centered logo
    │   └── CosmicBackground.tsx # Background component
    └── assets/
        ├── images/fond_duelo.webp  # Cosmic stellar background
        ├── header/                  # Header icons
        └── tabs/                    # Tab bar icons
```

## Key Features Implemented

### Phase 1: Core Quiz Infrastructure
- Hierarchical data model: Super Category → Cluster → Theme
- Bulk CSV import (~30k questions, 60 themes for SCREEN)
- Quiz logic: 7 questions (2 Easy, 3 Medium, 2 Hard, unique angles)
- Guest login with username
- Full gameplay flow: matchmaking → quiz → results

### Phase 2: Glassmorphism Néon-Cristal Design (Current)
- **Cosmic stellar background**: Fixed background on ALL pages via CSS injection
- **Frosted glass header**: Dark semi-opaque bar with cyan neon bottom border
- **Frosted glass footer**: Dark semi-opaque bar with cyan neon top border
- **Glass containers**: All cards/panels use dark frosted glass with neon borders
- **Neon-crystal borders**: Uniform cyan neon borders on all UI elements
- **White text**: High-visibility sans-serif labels throughout
- **Footer correction**: "MESSAGE" label (not "Massage" or "Social")
- **Uniform border-radius**: 16px on all panels
- **Design tokens**: Centralized in `/theme/glassTheme.ts`

## Design Tokens (glassTheme.ts)
- Glass BG: `rgba(8, 8, 24, 0.65)`
- Glass BG Dark: `rgba(5, 5, 18, 0.75)`
- Glass BG Light: `rgba(15, 15, 40, 0.55)`
- Neon Cyan Border: `rgba(0, 255, 255, 0.25)`
- Neon Bright Border: `rgba(0, 255, 255, 0.45)`
- Border Radius: 16px (uniform)
- Text Primary: #FFFFFF
- Text Secondary: rgba(255, 255, 255, 0.7)

## Key API Endpoints
- `POST /api/auth/register-guest` - Guest login
- `GET /api/explore/super-categories` - List super categories
- `GET /api/themes/explore` - Hierarchical theme data
- `GET /api/theme/{theme_id}` - Theme detail
- `GET /api/game/questions-v2?theme_id={id}` - Quiz questions
- `POST /api/game/submit-v2` - Submit quiz results
- `GET /api/profile-v2/{user_id}` - User profile
- `GET /api/static/fond_duelo.webp` - Serve cosmic background image

## Prioritized Backlog

### P0 - Import Remaining Data
- Import CSV data for other super categories (SOUND, ARENA, LEGENDS, LAB, etc.)
- Waiting for user to provide CSV files

### P1 - Theme Icons
- Integrate URL_Icone from CSV for theme icons
- Replace placeholder initials with actual icon images
- Waiting for user to provide icon URLs

### P2 - Follow & Leaderboard
- Implement "Follow" functionality on theme detail page
- Implement theme-specific leaderboards
- Backend + frontend logic

### P3 - Social Features
- Real-time chat improvements
- Push notifications
- Friend system

### P4 - Advanced Features
- Auth Google/Apple
- Player filters (age, distance)
- Video support in posts
- Deep Links
- WebSocket matchmaking
- Seasons system

### P5 - Refactoring
- Split server.py into modules (routes, models, etc.)
- Clean legacy category code from category-detail.tsx
