# FC26 Career Mode

A full-stack Football Career Mode simulation app.

## Project Structure

```
fc26_career_mode/
├── app/               # Next.js App Router pages
├── components/        # Reusable React components
├── data/              # Static data (leagues, logos)
├── lib/               # API helpers
├── utils/             # Shared utilities
├── public/            # Static assets (logos, flags, player images)
├── backend/           # Django REST API backend
│   ├── clubs/         # Club data + management
│   ├── leagues/       # League structure
│   ├── players/       # Player data + CSV import
│   ├── matches/       # Match engine
│   ├── contracts/     # Contract management
│   ├── transfers/     # Transfer logic
│   ├── tactics/       # Formation & tactics
│   ├── youth/         # Youth academy
│   ├── simulation/    # Match simulation engine
│   ├── realtime/      # WebSocket / Channels
│   ├── media/         # Media/press
│   ├── notifications/ # In-game notifications
│   ├── schedules/     # Season scheduling
│   ├── infrastructure/# Infrastructure management
│   ├── users/         # User accounts
│   ├── config/        # Django settings & URLs
│   └── manage.py
└── package.json       # Frontend deps (Next.js, Zustand, csv-parser)
```

## Frontend Setup

```bash
npm install
npm run dev
```

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Data Import

```bash
cd backend
python manage.py import_fc_data          # Import players from CSV
python manage.py generate_club_data      # Generate club data
python manage.py generate_ages           # Generate player ages
python manage.py generate_player_values  # Generate player values
```
