"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      // 1. Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(user);

      // 2. Fetch ONLY this user's resumes (Thanks to RLS, this is secure!)
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Show newest first

      if (error) {
        console.error("Error fetching resumes:", error);
      } else {
        setResumes(data || []);
      }
      
      setLoading(false);
    };

    checkUserAndFetchData();
  }, []);

  // If not logged in, show a friendly message
  if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <p className="text-gray-500 text-lg">Loading your dashboard...</p>
       </div>
     );
   }

   // 2. If not logged in, show a friendly message
   if (!user) {
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📂 My Dashboard</h1>
            <p className="text-gray-500">Welcome back, {user.email}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/tailor" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm">
              ✨ Tailor New Resume
            </Link>
            <Link href="/search" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm">
              🔍 Search Jobs
            </Link>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-sm"
            >
              Log Out
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading your saved resumes...</p>
        ) : resumes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">You haven't saved any tailored resumes yet.</p>
            <Link href="/tailor" className="text-blue-600 hover:underline font-semibold">
              Create your first tailored resume →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {resumes.map((resume) => (
              <div key={resume.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {resume.job_description ? resume.job_description.substring(0, 60) + '...' : 'Untitled Job'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Saved on: {new Date(resume.created_at).toLocaleDateString()} at {new Date(resume.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Tailored
                  </span>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-100">
                  {resume.tailored_text.substring(0, 300)}...
                </div>
                
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={() => alert("Full resume:\n\n" + resume.tailored_text)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    View Full Resume
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}