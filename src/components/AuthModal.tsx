"use client";

import { X, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  onFirebaseUser,
  signInEmail,
  signUpEmail,
  signOutFb,
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