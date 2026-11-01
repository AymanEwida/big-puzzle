# Big Puzzle

A multiplayer puzzle game where players join and work together to solve one huge puzzle made of **60,000 pieces**.

## Tech Stack

| Part   | Technology                                   |
| ------ | -------------------------------------------- |
| Client | React, TypeScript, Vite, Tailwind CSS        |
| Server | Go, WebSockets (`gorilla/websocket`)         |

## Project Structure

```
big-puzzle/
├── client/   # React + TypeScript frontend
└── server/   # Go backend (WebSocket server)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [Go](https://go.dev/) 1.27+

### Run the server

```bash
cd server
go run .
```

The server listens on port `8080`.

### Run the client

```bash
cd client
npm install
npm run dev
```

### Other client scripts

```bash
npm run build    # Type-check and build for production
npm run lint     # Run ESLint
npm run test     # Run tests
```
