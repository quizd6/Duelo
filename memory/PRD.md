# Duelo - PRD (Product Requirements Document)

## Vision
Application de quiz multijoueur compétitive avec esthétique "Dark Mode Premium", inspirée de QuizUp (2014).

## Stack Technique
- **Frontend**: React Native Expo (SDK 54) avec Expo Router
- **Backend**: FastAPI (Python) avec SQLAlchemy + asyncpg
- **Base de données**: PostgreSQL (Supabase)
- **Migrations**: Alembic

## Fonctionnalités Implémentées

### 1. Authentification
- Mode Invité avec pseudo unique (vérification en temps réel)
- Détection automatique du pays via IP (ip-api.com)

### 2. Système de Jeu
- Matchmaking intelligent par catégorie (niveau +/- 5)
- Bot fallback après 5 secondes
- 7 questions par match, chronomètre 10s
- Scoring basé sur la vitesse

### 3. Catégories
- Séries TV Cultes, Géographie Mondiale, Histoire de France (10 questions chacune)

### 4. Progression Par Catégorie
- XP par catégorie (formule: 500 + (N-1)^2 * 10, cap niveau 50)
- Titres de maîtrise débloquables (niveaux 1, 10, 20, 35, 50)
- Sélection de titre à afficher
- Modal de célébration à chaque nouveau titre

### 5. Page Détail Catégorie + Mur Social
- Header catégorie (icône, nom, description)
- Boutons Jouer / Suivre / Classement
- Barre de progression questions complétées
- Stats: niveau, followers, total questions
- Classement par catégorie (modal) - lignes cliquables vers profil joueur
- Mur communautaire: posts texte + image
- Likes (toggle) + Commentaires
- Follow/Unfollow catégorie
- Noms d'auteurs cliquables vers profil joueur

### 6. Profil Joueur Public (NOUVEAU - 2026-03-06)
- Avatar avec anneau violet, pseudo, titre, pays + drapeau
- Badges catégorie avec niveaux
- Titres de champion (#1 par catégorie)
- Boutons Jouer / Suivre / Message
- Stats: Parties jouées, Abonnés, Abonnements
- Mur de publications cross-catégories (lecture seule)

### 7. Système de Follow entre joueurs (NOUVEAU - 2026-03-06)
- Follow/Unfollow toggle entre joueurs
- Protection self-follow
- Compteurs followers/following

### 8. Chat Éphémère (NOUVEAU - 2026-03-06)
- Messagerie 1-à-1 entre joueurs
- Messages auto-supprimés après 7 jours
- Bulles de messages (envoyé = violet, reçu = gris)
- Indicateur de messages non lus
- Polling toutes les 5 secondes
- Format heure intelligent (il y a X min/h/j)
- Limite 500 caractères par message

### 9. Onglet Joueurs (NOUVEAU - 2026-03-06)
- Recherche de joueurs par pseudo
- Filtres par catégorie d'intérêt
- Liste avec avatar, pseudo, titre, XP, niveau
- Onglet Messages avec conversations et non-lus

### 10. Admin Dashboard
- Import bulk de questions avec détection doublons

## Architecture Base de Données
- **users**: id, pseudo, email, country, xp_series_tv, xp_geographie, xp_histoire, selected_title, mmr, stats...
- **questions**: id, category, question_text, options, correct_option, difficulty
- **matches**: id, player1_id, player2_pseudo, category, scores, xp_earned...
- **category_follows**: id, user_id, category_id
- **wall_posts**: id, user_id, category_id, content, image_base64
- **post_likes**: id, user_id, post_id
- **post_comments**: id, user_id, post_id, content
- **player_follows**: id, follower_id, followed_id (UNIQUE constraint)
- **chat_messages**: id, sender_id, receiver_id, content, read, created_at

## API Endpoints

### Auth
- POST /api/auth/register-guest (+ IP geolocation)
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

### Social Wall
- GET /api/category/{id}/detail?user_id=X
- POST /api/category/{id}/follow
- GET /api/category/{id}/leaderboard
- GET /api/category/{id}/wall?user_id=X
- POST /api/category/{id}/wall
- POST /api/wall/{post_id}/like
- POST /api/wall/{post_id}/comment
- GET /api/wall/{post_id}/comments

### Player Profile & Social (NOUVEAU)
- GET /api/player/{user_id}/profile?viewer_id=X
- POST /api/player/{user_id}/follow
- GET /api/players/search?q=X&category=Y&country=Z&limit=N

### Chat (NOUVEAU)
- POST /api/chat/send
- GET /api/chat/conversations/{user_id}
- GET /api/chat/{user_id}/messages?with_user=X
- GET /api/chat/unread-count/{user_id}

## Architecture Frontend
```
frontend/app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator (Jouer / Joueurs / Profil)
│   ├── home.tsx         # Écran principal, liste catégories
│   ├── players.tsx      # NOUVEAU - Recherche joueurs + Messages
│   └── profile.tsx      # Profil utilisateur
├── category-detail.tsx  # Page détail catégorie + mur social
├── player-profile.tsx   # NOUVEAU - Profil public joueur
├── chat.tsx             # NOUVEAU - Chat 1-à-1
├── matchmaking.tsx      # Écran matchmaking
├── results.tsx          # Résultats de match
└── index.tsx            # Écran d'inscription
```

## Prochaines Étapes (Backlog)
1. Authentification Google/Apple (fournira l'âge)
2. Filtre joueurs par âge (post-auth Google/Apple)
3. Support vidéo dans les posts du mur
4. Plus de catégories et questions
5. Deep Links pour partage
6. Matchmaking temps réel (WebSocket)
7. Système de saisons et récompenses
8. Notifications push
