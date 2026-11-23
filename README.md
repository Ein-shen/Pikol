# Pikol

**A Pickleball Management System for Open Play and Tournament Organization**

Pikol is a web-based application designed to simplify pickleball activities by helping organizers manage open-play sessions, organize players, create teams, and run tournaments.

Whether organizing casual games or competitive tournaments, Pikol provides tools to make player management and tournament coordination easier.

## Features

### Open Play Management

- Organize and manage pickleball open-play sessions.
- Manage player participation.
- Organize players into teams.

### Tournament Management

- Create and manage pickleball tournaments.
- Register and edit participating teams.
- Generate random team pairings.
- Organize group-stage matches.
- Manage knockout brackets and tournament progression.
- Record and update match scores.
- Support different tournament formats, including singles, doubles, and team-based formats.

### Standings and Results

- Track match results and team performance.
- View group standings and rankings.
- Determine tournament placements based on match outcomes.

### Authentication

- User registration and login. \<td className="py-3 pr-3 align-top text-sm">{i + 1}\</td>

                  \<td className="py-3 align-top border-b flex flex-col sm\:flex flex-row border-white/10 theme-border">

                    \<div className="text-sm capitalize">{pairLabel(row\.team)}\</div>

                    \<div className="mt-0.5 text-xs font-normal capitalize theme-muted">

                      {row\.team.name}&#x20;

                    \</div>

                  \</td
- Password hashing.
- JWT-based authentication using HTTP-only cookies.
- Protected routes for authenticated users.

## Tech Stack

| Category       | Technologies            |
| -------------- | ----------------------- |
| Frontend       | React, Vite, JavaScript |
| Styling        | Tailwind CSS            |
| Backend        | Node.js, Express.js     |
| Database       | PostgreSQL              |
| Authentication | JWT, bcrypt             |
| HTTP Client    | Axios                   |
| Routing        | React Router            |
| Charts         | Recharts                |
| Icons          | Lucide React            |
| Deployment     | Docker, Railway         |

## Project Structure

```text
Pikol/
├── backend/
│   ├── middleware/
│   ├── routes/
│   ├── uploads/
│   ├── db.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
│
├── Dockerfile
├── .dockerignore
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Ein-shen/Pikol.git
```

```bash
cd Pikol
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_secret_key
```

You can also configure PostgreSQL using individual database variables instead of `DATABASE_URL`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

### 4. Run the Application

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open the local URL provided by Vite, usually:

```text
http://localhost:5173
```

**Note:** Make sure your PostgreSQL database and required tables are configured before running the application.

## Docker

Pikol includes a Dockerfile that builds the React frontend and serves it through the Express backend.

From the project root:

```bash
docker build -t pikol .
```

Run the container:

```bash
docker run -p 5000:5000 --env-file backend/.env pikol
```

Open:

```text
http://localhost:5000
```

## Environment Variables

| Variable       | Description                                   |
| -------------- | --------------------------------------------- |
| `PORT`         | Backend server port                           |
| `CLIENT_URL`   | Frontend URL for CORS                         |
| `DATABASE_URL` | PostgreSQL connection string                  |
| `JWT_SECRET`   | Secret key used to sign authentication tokens |
| `DB_HOST`      | PostgreSQL host (alternative configuration)   |
| `DB_PORT`      | PostgreSQL port                               |
| `DB_NAME`      | Database name                                 |
| `DB_USER`      | Database username                             |
| `DB_PASSWORD`  | Database password                             |

## Purpose

Pikol aims to make pickleball tournament organization more accessible and manageable by bringing player registration, team organization, match tracking, and tournament management into one application.

---

**Developed by [Shen Sarsale](https://github.com/Ein-shen)**

[GitHub Repository](https://github.com/Ein-shen/Pikol)
