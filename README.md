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

Follow the steps below to stand up a Firestore backend that works with this UI:

1. **Create a Firebase project**
   - Visit <https://console.firebase.google.com/> and click **Add project**.
   - Give it a recognizable name (for example, `roommate-parking`), disable Google Analytics if you do not need it, and finish the wizard.
2. **Enable Firestore in Native mode**
   - In the left sidebar open **Build → Firestore Database**.
   - Click **Create database**, choose **Start in production mode** (recommended), select a region that is close to your roommates, and confirm.
3. **Add a Web App**
   - From the project overview page click the web (`</>`) icon.
   - Pick an app nickname like `parking-tracker-web`, leave hosting unchecked, and register the app.
   - Copy the config snippet that Firebase shows (`apiKey`, `authDomain`, etc.). We will paste these into the Vite environment file next.
4. **Create the environment file**
   - Duplicate the provided template and fill in the values from the previous step:

     ```bash
     cp .env.example .env
     ```

     ```env
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=sender-id
     VITE_FIREBASE_APP_ID=app-id
     ```
5. **Seed the `parking-spots` collection (optional)**
   - The UI auto-creates spot documents, but you can pre-seed them for clarity.
   - In Firestore, create a collection named `parking-spots` with four documents:
     - `garage-1`, `garage-2`, `driveway-1`, `driveway-2`
   - Each document should contain fields for `label`, `status`, `updatedBy`, and `updatedAt` (set `updatedAt` to a server timest
amp via the console's *Use server timestamp on write* option). The exact values do not matter—the app overwrites them during the
 first interaction.

     The UI normalizes missing fields if you skip this step.
6. **Set Firestore security rules**
   - Open **Build → Firestore Database → Rules** and replace the defaults with:

     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /parking-spots/{spotId} {
           allow read: if true;
           allow write: if request.resource.data.updatedBy in ['Aswin', 'Jack', 'Joel', 'Nishant'];
         }
       }
     }
     ```

     Adjust the roommate list or tighten authentication once you introduce proper sign-in.

### 3. Run the app locally

```bash
npm run dev
```

The development server runs on `http://localhost:5173` by default.

### 4. Build for production

```bash
npm run build
```

The optimized output will be generated in the `dist/` directory. You can deploy it to Vercel, Netlify, or any static hosting service that supports Vite apps.

## Deployment Notes

- Set the same Firebase environment variables in your hosting provider.
- On Vercel or Netlify, add the keys from `.env` via the dashboard before your first deploy.
- If you need to share edit access beyond the roommates listed in the Firestore rules above, update the array or add authentication.
- Optionally seed the `parking-spots` collection ahead of time so the cards display labels immediately after deployment.

## Tech Stack

- React + Vite
- Tailwind CSS
- Firebase Firestore (Realtime)
- TypeScript

Enjoy smooth parking coordination for Aswin, Jack, Joel, and Nishant! 🚗
