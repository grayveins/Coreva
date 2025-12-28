<div align="center">
  <h3 align="center">Coreva</h3>

  <p align="center">
    AI-powered fitness and nutrition platform built with a mobile-first, full-stack architecture.
    <br />
    <br />
    <a href="#getting-started"><strong>Get Started »</strong></a>
    &middot;
    <a href="#roadmap">Roadmap</a>
    &middot;
    <a href="#contributing">Contributing</a>
  </p>
</div>

---

## About The Project

**Coreva** is a mobile-first AI fitness platform designed to combine workout tracking, meal logging, and adaptive coaching into a single, cohesive experience.

The project focuses on:
- Real user data persistence (workouts, meals, chat history)
- Secure authentication and authorization
- AI-assisted coaching via OpenAI
- Scalable backend architecture suitable for production deployment

This repository represents the active development of the Coreva MVP, built with a clear separation between frontend, backend, and AI services.

### Built With

- **Frontend**
  - React Native (Expo)
  - TypeScript
  - Expo Router

- **Backend**
  - Fastify (Node.js)
  - Supabase (PostgreSQL, Auth, Storage)
  - Supabase Edge Functions

- **AI**
  - OpenAI API (GPT-based coaching)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

Follow these steps to run Coreva locally for development.

### Prerequisites

- Node.js (v18+ recommended)
- npm
- Expo CLI
- Supabase account

```sh
npm install -g expo-cli
