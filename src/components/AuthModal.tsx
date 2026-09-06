"use client";

import { X, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  onFirebaseUser,
  signInEmail,
  signUpEmail,
  signOutFb,
  signInWithGoogle,
  type FbUser,
} from "@/lib/firebase/client";

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("email-already-in-use")) return "That email is already registered. Sign in instead.";
  if (msg.includes("wrong-password")) return "Wrong password. Try again.";
  if (msg.includes("user-not-found")) return "No account with that email — create one first.";
  if (msg.includes("invalid-email")) return "That email doesn't look valid.";
  if (msg.includes("weak-password")) return "Password is too weak — use at least 6 characters.";
  if (msg.includes("too-many-requests")) return "Too many attempts. Wait a minute, then try again.";
  if (msg.includes("network-request-failed")) return "No internet connection. Try again.";
  if (msg.includes("popup-closed-by-user") || msg.includes("cancelled-popup-request"))
    return "Sign-in window closed before finishing. Try again.";
  if (msg.includes("popup-blocked")) return "Your browser blocked the Google window. Allow popups for this site, then try again.";
  if (msg.includes("unauthorized-domain")) return "The Google sign-in domain isn't approved yet. Add groquiz.vercel.app in the Firebase console under Authentication → Settings → Authorized domains.";
  return "That didn't work. Please try again.";
}

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [user, setUser] = useState<FbUser | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    return onFirebaseUser((u) => {
      setUser(u);
      if (u && !u.anonymous) setError(null);
    });
  }, [open]);

  useEffect(() => {
    if (open) {
      setError(null);
      setPassword("");
    }
  }, [open, mode]);

  if (!open) return null;

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setError("Enter both email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signInEmail(e, password);
      else await signUpEmail(e, password);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const signedIn = user && !user.anonymous;

  return (
    <div className="fixed inset-0 z-[60] bg-[#151021]/90 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#251C33] border border-[#3A2E50] rounded-2xl p-6 w-[22rem] max-w-full space-y-4 screen-enter shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-[#F0EAF6]">
            {signedIn ? "Your account" : "Sync across devices"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#8D7FA0] hover:text-[#F0EAF6] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {signedIn ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-[#151021] rounded-xl border border-[#3A2E50] px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-fuchsia-400/20 flex items-center justify-center shrink-0">
                <User size={16} className="text-fuchsia-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F0EAF6] [overflow-wrap:anywhere]">
                  {user?.email}
                </p>
                <p className="text-xs text-[#8D7FA0]">
                  Your quizzes sync to this account on every device.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void signOutFb().then(onClose);
              }}
              className="w-full py-2.5 rounded-xl border border-red-400/40 text-red-400 text-sm font-semibold hover:bg-red-400/10 transition-all"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#B8A9C8] leading-relaxed">
              You're signed in anonymously, so your quizzes stay on this
              device. Create a free account to see them on any device.
            </p>

            <div className="flex gap-1 bg-[#151021] rounded-xl p-1 border border-[#3A2E50]">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === "signin"
                    ? "bg-fuchsia-400/20 text-[#F0EAF6]"
                    : "text-[#8D7FA0]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === "signup"
                    ? "bg-fuchsia-400/20 text-[#F0EAF6]"
                    : "text-[#8D7FA0]"
                }`}
              >
                Create account
              </button>
            </div>

            <button
              type="button"
              onClick={() => void signInGoogle()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[#3A2E50] bg-[#151021] text-sm font-semibold text-[#F0EAF6] hover:border-fuchsia-400/50 transition-all disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.86Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24a11.44 11.44 0 0 0 7.93-2.87l-3.87-3c-1.08.72-2.47 1.15-4.06 1.15-3.12 0-5.76-2.1-6.7-4.94H1.28v3.09A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.34a7.2 7.2 0 0 1 0-4.68V6.57H1.28a12 12 0 0 0 0 10.86l4.02-3.09Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.72c1.94 0 3.68.67 5.05 1.98l3.55-3.55A11.44 11.44 0 0 0 12 0 12 12 0 0 0 1.28 6.57l4.02 3.09C6.24 6.82 8.88 4.72 12 4.72Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#3A2E50]" />
              <span className="text-xs text-[#8D7FA0]">or use email</span>
              <div className="flex-1 h-px bg-[#3A2E50]" />
            </div>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              type="email"
              autoComplete="email"
              placeholder="Email"
              className="w-full bg-[#151021] border border-[#3A2E50] rounded-xl px-4 py-3 text-sm text-[#F0EAF6] placeholder-[#8D7FA0] focus:outline-none focus:border-fuchsia-400/60 transition-colors"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password"
              className="w-full bg-[#151021] border border-[#3A2E50] rounded-xl px-4 py-3 text-sm text-[#F0EAF6] placeholder-[#8D7FA0] focus:outline-none focus:border-fuchsia-400/60 transition-colors"
            />

            {error && (
              <p className="text-xs text-red-400 [overflow-wrap:anywhere]">{error}</p>
            )}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account & sync"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}