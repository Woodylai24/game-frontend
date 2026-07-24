"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isSoundEnabled, setSoundEnabled } from "@/lib/soundNotifications";

export default function SettingsPage() {
  const { user, loading, isAuthenticated, isGuest, updateUsername, logout } =
    useAuth();
  const router = useRouter();

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  // Per-device preference (localStorage); default on. Read lazily on first
  // render to avoid a localStorage hit during SSR/static export.
  const [soundEnabled, setSoundEnabledState] = useState(true);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleUsernameSave = async () => {
    if (newUsername.length < 3 || newUsername.length > 20) {
      setUsernameError("Username must be between 3 and 20 characters");
      return;
    }
    setUsernameError("");
    setUsernameSaving(true);

    try {
      await updateUsername(newUsername);
      setEditingUsername(false);
    } catch (err) {
      setUsernameError(
        err instanceof Error ? err.message : "Failed to update username",
      );
    } finally {
      setUsernameSaving(false);
    }
  };

  const authProviderBadge = () => {
    switch (user.authProvider) {
      case "google":
        return (
          <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-full">
            Google
          </span>
        );
      case "guest":
        return (
          <span className="text-xs bg-amber-900/30 text-amber-300 px-2 py-0.5 rounded-full">
            Guest
          </span>
        );
      default:
        return (
          <span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded-full">
            Email
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-gray-200"
            >
              &larr; Back to Lobby
            </button>
            <h1 className="text-lg font-semibold">Settings</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isGuest && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 mb-6">
            <p className="text-amber-300 text-sm">
              You&apos;re playing as a guest. Your progress won&apos;t be
              saved across devices.
            </p>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg border border-gray-800 divide-y">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Username
                </label>
                {editingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="px-3 py-1.5 border border-gray-700 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      minLength={3}
                      maxLength={20}
                      autoFocus
                    />
                    <button
                      onClick={handleUsernameSave}
                      disabled={usernameSaving}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-700"
                    >
                      {usernameSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUsername(false);
                        setUsernameError("");
                      }}
                      className="text-gray-400 hover:text-gray-200 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-lg">{user.username}</p>
                )}
                {usernameError && (
                  <p className="text-red-500 text-sm mt-1">{usernameError}</p>
                )}
              </div>
              {!editingUsername && (
                <button
                  onClick={() => {
                    setNewUsername(user.username);
                    setEditingUsername(true);
                    setUsernameError("");
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Email
            </label>
            <p className="text-lg">{user.email || "—"}</p>
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Auth Provider
            </label>
            <div className="mt-1">{authProviderBadge()}</div>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Notification Sound
                </label>
                <p className="text-sm text-gray-500">
                  Plays a sound when it becomes your turn. Saved on this device
                  only.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                aria-label="Toggle notification sound"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  setSoundEnabledState(next);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  soundEnabled ? "bg-blue-500" : "bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">
            Danger Zone
          </h2>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-6 py-2 rounded-md hover:bg-red-600 font-medium"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
