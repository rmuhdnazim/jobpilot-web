"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function SearchPage() {
  const [user, setUser] = useState(null);
  const [skills, setSkills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);

      // Get the user's most recent resume
      const { data } = await supabase
        .from('resumes')
        .select('original_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].original_text) {
        // Auto-extract skills from their resume
        setSearching(true);
        try {
          const res = await fetch('/api/extract-skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText: data[0].original_text }),
          });
          const result = await res.json();
          if (result.skills) {
            setSkills(result.skills);
            setSearchQuery(result.skills.join(' '));
          }
        } catch (e) {
          console.error(e);
        }
        setSearching(false);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter some skills to search for!');
      return;
    }

    setSearching(true);
    setJobs([]);

    try {
      // RemoteOK free API - no key needed!
      const response = await fetch(`https://remoteok.com/api`, {
        headers: { 'User-Agent': 'JobPilotAI/1.0' }
      });
      const data = await response.json();

      // RemoteOK returns the first item as metadata, filter it out
      const allJobs = data.filter(item => item.id && item.position);

      // Simple client-side skill matching
      const queryWords = searchQuery.toLowerCase().split(' ').filter(w => w.length > 2);
      
      const matchedJobs = allJobs
        .map(job => {
          const jobText = `${job.position} ${job.description || ''} ${job.tags?.join(' ') || ''}`.toLowerCase();
          const matchCount = queryWords.filter(word => jobText.includes(word)).length;
          return { ...job, matchCount };
        })
        .filter(job => job.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 20); // Top 20 matches

      setJobs(matchedJobs);
    } catch (error) {
      console.error("Search error:", error);
      alert("Failed to fetch jobs. Please try again.");
    }

    setSearching(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Analyzing your resume...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🔍 Smart Job Search</h1>
            <p className="text-gray-500">Welcome, {user?.email}</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Skills Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h2 className="font-bold text-gray-800 mb-3">🎯 Your Detected Skills</h2>
          <p className="text-sm text-gray-500 mb-4">AI extracted these from your resume. Edit the search box to customize.</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                {skill}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter skills to search (e.g., React Python SQL)"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
            >
              {searching ? '🔍 Searching...' : '🚀 Find Jobs'}
            </button>
          </div>
        </div>

        {/* Jobs Results */}
        {jobs.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 text-xl mb-4">
              ✨ {jobs.length} Matching Jobs Found
            </h2>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{job.position}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        🏢 {job.company} {job.location && `• 📍 ${job.location}`}
                      </p>
                      {job.salary && <p className="text-sm text-green-600 font-semibold mt-1">💰 {job.salary}</p>}
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      {job.matchCount} skill matches
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {job.description?.replace(/<[^>]*>/g, '').substring(0, 250)}...
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.tags?.slice(0, 5).map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
                    >
                      🔗 View Original Job
                    </a>
                    <Link
                      href={`/tailor?job=${encodeURIComponent(job.description?.replace(/<[^>]*>/g, '').substring(0, 2000) || job.position)}`}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
                    >
                      ✨ Tailor Resume for This Job
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!searching && jobs.length === 0 && searchQuery && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No matching jobs found. Try different skills!</p>
          </div>
        )}
      </div>
    </div>
  );
}