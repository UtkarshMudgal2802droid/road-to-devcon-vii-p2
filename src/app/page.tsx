"use client";

import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    setMatches([]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      setAnswer(data.answer);
      setMatches(data.matches || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-8 font-sans">
      <main className="w-full max-w-2xl bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">Community People Finder</h1>
        <p className="text-gray-400 mb-8">Ask who can help you in the community.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-300 mb-2">
              Your Question
            </label>
            <textarea
              id="question"
              placeholder="Is anyone here good at Rust and free to mentor this month?"
              rows={4}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500 resize-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Searching community..." : "Find Mentor"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-8 p-6 bg-gray-900 border border-gray-700 rounded-lg">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Result</h2>
            <div className="text-gray-200 whitespace-pre-wrap leading-relaxed mb-4">
              {answer}
            </div>
            
            {matches.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recommended Members</h3>
                <ul className="flex flex-wrap gap-2">
                  {matches.map(name => (
                    <li key={name} className="px-3 py-1 bg-blue-900/30 text-blue-300 border border-blue-800 rounded-full text-sm font-medium">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
