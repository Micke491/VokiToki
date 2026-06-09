# VokiToki

Real-time chat application with support for direct messages, group conversations, media sharing, and voice/video calls.

Built with **Next.js 16**, **MongoDB**, **Pusher**, and **LiveKit**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Micke491/chat-app)

## Overview

VokiToki is a full-stack messaging platform designed for seamless real-time communication. It provides a modern, responsive interface with theme support and a comprehensive feature set comparable to production chat applications.

**Live demo:** [vokitoki.vercel.app](https://vokitoki.vercel.app)

## Features

**Messaging**
- Real-time message delivery via Pusher Channels
- One-on-one and group conversations
- Message editing, deletion (for self or everyone), and forwarding
- Reply threads with quoted context
- Message pinning and emoji reactions
- Delivery and read receipt tracking with per-user granularity
- Live typing indicators

**Media**
- Image, video, and audio file uploads with cloud storage
- Inline GIF and sticker pickers
- Voice message recording and playback
- Automatic link preview generation with metadata extraction

**Calls**
- Voice and video calling over LiveKit
- Incoming call notifications with accept/decline handling

**Authentication & Security**
- JWT-based session management with bcrypt password hashing
- Email-based password reset flow
- Two-factor authentication (2FA)
- User blocking

**Settings & Personalization**
- Dark and light themes with system preference detection
- Configurable read receipt visibility
- Profile customization (avatar, display name, bio)
- Per-chat mute controls

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| Database | MongoDB, Mongoose |
| Real-time | Pusher Channels |
| Calls | LiveKit |
| Storage | Cloudinary |
| Email | Nodemailer, Brevo SMTP |

## Prerequisites

- Node.js 18+
- MongoDB instance Atlas
- Pusher Channels account
- Cloudinary account
- LiveKit Cloud account
- Giphy API key
- Brevo (Sendinblue) SMTP credentials

## Getting Started

```bash
git clone https://github.com/Micke491/chat-app.git
cd chat-app
npm install
```

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Refer to `.env.example` for the full list of required environment variables. All values are service-specific keys and secrets that you obtain from the respective provider dashboards listed under [Prerequisites](#prerequisites).

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint checks |

## Deployment

The application is optimized for deployment on **Vercel**. Connect your GitHub repository, configure the environment variables in the Vercel dashboard, and deploy.

For other platforms, run `npm run build` and serve the `.next` output directory with `npm start`.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
