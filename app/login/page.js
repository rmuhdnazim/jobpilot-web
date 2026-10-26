   "use client"; // This tells Next.js this page needs to interact with the browser
   import { useState } from 'react';
   import { supabase } from '../../lib/supabase';

   export default function LoginPage() {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [loading, setLoading] = useState(false);
     const [message, setMessage] = useState('');

     // Function to handle new users signing up
     const handleSignUp = async () => {
       setLoading(true);
       const { error } = await supabase.auth.signUp({ email, password });
       if (error) setMessage('Error: ' + error.message);
       else setMessage('Account created! You can now log in.');
       setLoading(false);
     };

     // Function to handle existing users logging in
     const handleLogin = async () => {
       setLoading(true);
       const { error } = await supabase.auth.signInWithPassword({ email, password });
       if (error) setMessage('Error: ' + error.message);
       else setMessage('Logged in successfully! Welcome to JobPilot.');
        window.location.href = '/dashboard';
       setLoading(false);
     };

     return (
       <div className="flex min-h-screen items-center justify-center bg-gray-100">
         <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
           <h1 className="text-2xl font-bold text-center text-gray-800">🚀 JobPilot Ai</h1>
           <p className="text-center text-gray-500">Your AI Job Search Assistant</p>
           
           <input 
             type="email" 
             placeholder="Email Address" 
             value={email} 
             onChange={(e) => setEmail(e.target.value)} 
             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
           />
           <input 
             type="password" 
             placeholder="Password" 
             value={password} 
             onChange={(e) => setPassword(e.target.value)} 
             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
           />
           
           <div className="flex space-x-4">
             <button 
               onClick={handleLogin} 
               disabled={loading} 
               className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
             >
               Log In
             </button>
             <button 
               onClick={handleSignUp} 
               disabled={loading} 
               className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
             >
               Sign Up
             </button>
           </div>
           
           {message && <p className="text-center text-sm text-gray-600 mt-4">{message}</p>}
         </div>
       </div>
     );
   }