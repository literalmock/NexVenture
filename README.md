# NEXVENTURE

NEXVENTURE is a MERN application for founders, investors, mentors, and students.

## Stack

- MongoDB with Mongoose
- Express and Node.js API
- React and Vite client

## Folder structure

```text
nexventure/
├── backend/
│   ├── config/          # Environment and MongoDB connection
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express error handlers
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── utils/           # Shared backend helpers
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/          # Static files
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── hooks/       # React hooks
│   │   ├── lib/         # Auth, API, and shared helpers
│   │   ├── routes/      # Application pages
│   │   ├── utils/       # Frontend constants
│   │   ├── main.jsx     # Browser entry point
│   │   └── router.jsx   # Client-side routes
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json         # Workspace scripts
└── README.md
```

## Local setup

1. Install Node.js 20+ and start MongoDB locally.
2. Install dependencies from the project root:

   ```bash
   npm install
   ```

3. Create the environment files:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Start the frontend and backend together:

   ```bash
   npm run dev
   ```

The React client runs at `http://localhost:8080`. The API runs at
`http://localhost:5050/api/v1`, with its health endpoint at
`http://localhost:5050/api/v1/health`.

Accounts created through the signup screen are stored in MongoDB. Development
does not create or expose shared demo credentials.

## Commands

```bash
npm run dev             # Run both apps
npm run dev:frontend    # Run only React/Vite
npm run dev:backend     # Run only Express/MongoDB
npm run build           # Build the frontend
npm run lint            # Lint both workspaces
```
