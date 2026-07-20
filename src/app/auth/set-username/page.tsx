"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";

export default function SetUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/username", {
        method: "PUT",
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update username");
        return;
      }

      // Save new token (JWT contains the updated username)
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // Force full reload so AuthContext picks up the updated username
      window.location.href = "/";
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Choose a Username</h1>
        <p className="text-gray-400 text-center mb-6">
          Pick a username to get started. You can change it later.
        </p>
        {error && (
          <div className="bg-red-900/30 text-red-400 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-200 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your username"
              required
              minLength={3}
              maxLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">
              3–20 characters
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
