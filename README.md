# Roommate Parking Tracker

A mobile-first parking board for roommates to track who is in each garage and driveway spot in real time.

## Features

- 🔁 Live updates powered by Firebase Firestore subscriptions.
- 📱 Mobile-first 2×2 grid of large tappable cards for Garage and Driveway spots.
- 👤 Quick name capture stored in localStorage with badges for your current spot.
- ♿ Accessible focus states, aria-live status messaging, and keyboard-friendly controls.
- 🌙 Sleek Tailwind-powered styling with clear empty/occupied color states.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Create a new Firebase project (Firestore in Native mode) and add a Web App. Copy the configuration values into a new `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update `.env` with your Firebase project credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Enable Firestore

In the Firebase console, enable Firestore and make sure your security rules allow read/write access for authenticated users or for testing purposes adapt them to your needs. Each parking spot is stored under the `parking-spots` collection.

### 4. Run the app locally

```bash
npm run dev
```

The development server runs on `http://localhost:5173` by default.

### 5. Build for production

```bash
npm run build
```

The optimized output will be generated in the `dist/` directory. You can deploy it to Vercel, Netlify, or any static hosting service that supports Vite apps.

## Deployment Notes

- Set the same Firebase environment variables in your hosting provider.
- Ensure Firestore security rules restrict writes to your trusted roommates list if needed.
- Optionally seed the `parking-spots` collection with documents whose IDs are `garage-1`, `garage-2`, `driveway-1`, and `driveway-2`. The app will create them automatically on first run if they are missing.

## Tech Stack

- React + Vite
- Tailwind CSS
- Firebase Firestore (Realtime)
- TypeScript

Enjoy smooth parking coordination for Aswin, Jack, Joel, and Nishant! 🚗
