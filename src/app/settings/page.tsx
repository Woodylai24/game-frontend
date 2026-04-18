"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";

export default function SettingsPage() {
  const { user, loading, isAuthenticated, isGuest, updateUsername, logout } =
    useAuth();
  const router = useRouter();

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  const handleDisplayNameSave = async () => {
    if (!newDisplayName.trim()) {
      setDisplayNameError("Display name is required");
      return;
    }
    setDisplayNameError("");
    setDisplayNameSaving(true);

    try {
      const response = await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ displayName: newDisplayName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDisplayNameError(data.error || "Failed to update display name");
        return;
      }
      setEditingDisplayName(false);
      window.location.reload();
    } catch (_err) {
      setDisplayNameError("Something went wrong");
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const authProviderBadge = () => {
    switch (user.authProvider) {
      case "google":
        return (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            Google
          </span>
        );
      case "guest":
        return (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Guest
          </span>
        );
      default:
        return (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Email
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/")}
              className="text-gray-600 hover:text-gray-900"
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              You&apos;re playing as a guest. Your progress won&apos;t be
              saved across devices.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow divide-y">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Username
                </label>
                {editingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      minLength={3}
                      maxLength={20}
                      autoFocus
                    />
                    <button
                      onClick={handleUsernameSave}
                      disabled={usernameSaving}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      {usernameSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUsername(false);
                        setUsernameError("");
                      }}
                      className="text-gray-500 hover:text-gray-700 px-2"
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
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Display Name
            </label>
            {editingDisplayName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleDisplayNameSave}
                  disabled={displayNameSaving}
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {displayNameSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingDisplayName(false);
                    setDisplayNameError("");
                  }}
                  className="text-gray-500 hover:text-gray-700 px-2"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <p className="text-lg">{user.displayName || "—"}</p>
                <button
                  onClick={() => {
                    setNewDisplayName(user.displayName || "");
                    setEditingDisplayName(true);
                    setDisplayNameError("");
                  }}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
            {displayNameError && (
              <p className="text-red-500 text-sm mt-1">{displayNameError}</p>
            )}
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <p className="text-lg">{user.email || "—"}</p>
          </div>

          <div className="p-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Auth Provider
            </label>
            <div className="mt-1">{authProviderBadge()}</div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
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
