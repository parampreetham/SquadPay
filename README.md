# SquadPay

SquadPay is a lightweight web app for managing **cricket tournament collections**.  
It helps organizers keep track of who has paid, how much is pending, and generate shareable receipts – all from a clean, mobile-friendly dashboard.

---

## Live Demo

> **URL:** `https://<your-username>.github.io/SquadPay/`  
> (Update this once GitHub Pages is deployed.)

---

## Features

### 🏏 Tournament Management

- Create **multiple tournaments** (e.g. “Summer Cup 2025”, “Office League Season 3”).
- Quickly switch between tournaments from the top selector.
- Separate participants, totals and receipts per tournament.

### 👥 Squads & Players

- Add entries with:
  - **Name** (player / captain)
  - **Optional Team Name**
  - **WhatsApp contact**
  - **Fee (₹)**
- View all entries in a compact table with:
  - Fee / Paid / Remaining
  - Status badge (**Paid / Partial / Pending**)
  - Actions (Reminder, Receipt)

### 💰 Fee Tracking

- Automatic calculation of:
  - **Total Fee**
  - **Total Collected**
  - **Total Remaining**
- Edit **Paid** amount via a clean modal:
  - Shows fee, current paid, and lets you update safely.
  - Status updates automatically based on payment.

### 📲 WhatsApp Reminders

- One-click **WhatsApp reminder** per player/team.
- Pre-filled message includes:
  - Fee, Paid, Remaining
  - Player name and team name (if provided)
- Works smoothly on mobile (opens WhatsApp app) and desktop (WhatsApp Web).

### 🧾 Modern Receipts

- Per-participant **payment receipt** with:
  - Tournament name
  - Participant & team details
  - Contact
  - Fee / Paid / Remaining summary
  - Payment status (Paid / Partial / Pending)
  - Receipt ID and date
- Clean, print-optimized layout:
  - **Print / Save as PDF** only prints the receipt card, not the whole page.
- **Share as image**:
  - Captures the receipt card as a PNG.
  - Uses the browser’s share sheet when available (e.g. Android Chrome → WhatsApp).
  - Falls back to image download for manual sharing.

### 🔐 Organizer Access

- Google sign-in with Firebase Authentication.
- Only authenticated users can access the dashboard.
- Custom sign-out confirmation modal to avoid accidental logouts.

---

## Tech Stack

- **Frontend**
  - [React](https://react.dev/) (with Vite)
  - TypeScript
  - [Tailwind CSS](https://tailwindcss.com/) for the modern, sports-themed UI
  - [html2canvas](https://github.com/niklasvh/html2canvas) for “Share as Image” receipts
- **Backend / Services**
  - [Firebase Authentication](https://firebase.google.com/products/auth) – Google Sign-In
  - [Cloud Firestore](https://firebase.google.com/products/firestore) – tournaments & participants storage
- **Deployment**
  - [Vite](https://vitejs.dev/) static build
  - [GitHub Pages](https://pages.github.com/) + GitHub Actions for automatic deployment

---

## Project Structure

```text
src/
  App.tsx               # App shell, routing, auth, sign-out modal
  Dashboard.tsx         # Tournaments, participants table, fee stats, reminders
  Receipt.tsx           # Printable / sharable receipt view
  firebase.ts           # Firebase config (Auth + Firestore)
  types.ts              # Type definitions (Tournament, Participant, PaymentStatus)
  main.tsx              # React entry point
  index.css             # Tailwind base + global styles
  ...
.github/
  workflows/
    deploy.yml          # GitHub Pages deployment workflow
