# Duelo - PRD (Product Requirements Document)

## Vision
Application de quiz multijoueur compétitive avec esthétique "Dark Mode Premium", inspirée de QuizUp (2014).

## Stack Technique
- **Frontend**: React Native Expo (SDK 54) avec Expo Router
- **Backend**: FastAPI (Python)
- **Base de données**: Supabase (PostgreSQL) via SQLAlchemy + asyncpg
- **Migrations**: Alembic

## Fonctionnalités Implémentées

### 1. Authentification
- ✅ Mode Invité avec pseudo unique (vérification en temps réel)

### 2. Système de Jeu
- ✅ Matchmaking intelligent par catégorie (niveau +/- 5)
- ✅ Bot fallback après 5 secondes
- ✅ 7 questions par match, chronomètre 10s
- ✅ Scoring basé sur la vitesse

### 3. Catégories
- ✅ Séries TV Cultes, Géographie Mondiale, Histoire de France (10 questions chacune)

### 4. Progression Par Catégorie
- ✅ XP par catégorie (formule: 500 + (N-1)² × 10, cap niveau 50)
- ✅ Titres de maîtrise débloquables (niveaux 1, 10, 20, 35, 50)
- ✅ Sélection de titre à afficher
- ✅ Modal de célébration à chaque nouveau titre

### 5. Page Détail Catégorie + Mur Social ✅ NOUVEAU (2026-03-06)
- ✅ Header catégorie (icône, nom, description)
- ✅ Boutons Jouer / Suivre / Classement
- ✅ Barre de progression questions complétées
- ✅ Stats: niveau, followers, total questions
- ✅ Classement par catégorie (modal)
- ✅ Mur communautaire: posts texte + image
- ✅ Likes (toggle) + Commentaires
- ✅ Follow/Unfollow catégorie

### 6. Admin Dashboard
- ✅ Import bulk de questions avec détection doublons

## Architecture Base de Données
- **users**: id, pseudo, email, xp_series_tv, xp_geographie, xp_histoire, selected_title, mmr, stats...
- **questions**: id, category, question_text, options, correct_option, difficulty
- **matches**: id, player1_id, player2_pseudo, category, scores, xp_earned...
- **category_follows**: id, user_id, category_id
- **wall_posts**: id, user_id, category_id, content, image_base64
- **post_likes**: id, user_id, post_id
- **post_comments**: id, user_id, post_id, content

## API Endpoints
### Auth
- POST /api/auth/register-guest
- POST /api/auth/check-pseudo
- GET /api/auth/user/{id}

### Game
- GET /api/categories
- GET /api/game/questions?category=X
- POST /api/game/matchmaking
- POST /api/game/submit

### Profile & Progression
- GET /api/profile/{user_id}
- POST /api/user/select-title
- GET /api/leaderboard

### Social Wall (NOUVEAU)
- GET /api/category/{id}/detail?user_id=X
- POST /api/category/{id}/follow
- GET /api/category/{id}/leaderboard
- GET /api/category/{id}/wall?user_id=X
- POST /api/category/{id}/wall
- POST /api/wall/{post_id}/like
- POST /api/wall/{post_id}/comment
- GET /api/wall/{post_id}/comments

## Prochaines Étapes (Backlog)
1. ⬜ Support vidéo dans les posts du mur
2. ⬜ Plus de catégories et questions
3. ⬜ Authentification Google/Apple
4. ⬜ Deep Links pour partage
5. ⬜ Matchmaking temps réel (WebSocket)
6. ⬜ Système de saisons et récompenses
