import { useEffect, useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { Receipt } from "./Receipt";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    if (!auth) {
      alert("Firebase not configured.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
      alert("Failed to sign in. Check console.");
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } finally {
      setShowSignOutModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-300 text-sm">Checking auth…</div>
      </div>
    );
  }

  // 🔐 Not logged in – login screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="relative max-w-md w-full mx-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-tr from-emerald-400/20 via-squadpay-green/10 to-sky-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-lime-300 flex items-center justify-center font-bold text-slate-950">
                SP
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  SquadPay
                </h1>
                <p className="text-xs text-slate-400">
                  Tournament collections, simplified.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Sign in with Google to manage your{" "}
              <span className="text-emerald-400 font-medium">
                cricket tournament fees
              </span>{" "}
              – track who paid, who&apos;s pending, and send reminders in one
              place.
            </p>

            <button
              onClick={handleSignIn}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 text-sm shadow-lg shadow-emerald-500/30 transition"
            >
              <span className="inline-block h-4 w-4 rounded-full bg-white/80" />
              <span>Continue with Google</span>
            </button>

            <p className="mt-4 text-[11px] text-slate-500 text-center">
              Only authorized organizers can access the dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Logged in – header + routes + sign-out modal
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-lime-300 flex items-center justify-center text-slate-950 font-bold text-sm">
              SP
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                SquadPay
              </h1>
              <p className="text-[11px] text-slate-400">
                Cricket tournament collections dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-slate-300 font-medium">
                {user.email}
              </span>
              <span className="text-[10px] text-emerald-400/90">
                Organizer
              </span>
            </div>
            <button
              onClick={() => setShowSignOutModal(true)}
              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs text-slate-200 hover:border-rose-400/70 hover:text-rose-300 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <div className="max-w-6xl mx-auto px-4 py-6">
                <Dashboard />
              </div>
            }
          />
          <Route path="/t/:tournamentId/receipt/:id" element={<Receipt />} />
        </Routes>
      </main>

      {/* Sign-out confirmation modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-sm font-semibold text-slate-50 mb-2">
              Sign out?
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              You&apos;ll need to sign in again to manage your SquadPay
              dashboard. Are you sure you want to sign out?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:text-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-rose-400 transition shadow-md shadow-rose-500/40"
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
