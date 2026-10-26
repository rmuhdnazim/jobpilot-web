import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase with the MASTER KEY (bypasses RLS for background tasks)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  // Optional: Add a secret check so random people can't trigger your cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // For testing locally, we'll allow it if no secret is set, but in production, set a CRON_SECRET in .env
  }

  try {
    console.log("🕒 9:00 AM Digest: Starting...");

    // 1. Get all users (In a real app, you'd filter by users who opted-in)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    let emailsSent = 0;

    // 2. Loop through each user and send them a digest
    for (const user of users.users) {
      // Fetch their recent job matches (or mock some if the table is empty for testing)
      const { data: matches } = await supabase
        .from('job_matches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // If no matches yet, let's send a welcome/test email so you can see it working!
      const jobsToSend = matches && matches.length > 0 ? matches : [
        { job_title: "Senior Frontend Developer", company: "TechCorp", job_url: "https://example.com/job1", match_reason: "Matches your React and Next.js skills." },
        { job_title: "AI Engineer", company: "InnovateAI", job_url: "https://example.com/job2", match_reason: "Matches your Python and Machine Learning background." }
      ];

      // 3. Build the HTML Email
      const emailHtml = `
        <h1 style="color: #2563eb;">☕ Good morning! Here are your top job matches.</h1>
        <p>Hi there,</p>
        <p>JobPilot AI found these opportunities that match your resume while you were sleeping:</p>
        <ul style="list-style-type: none; padding: 0;">
          ${jobsToSend.map(job => `
            <li style="background: #f3f4f6; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
              <strong style="font-size: 18px;">${job.job_title}</strong> at ${job.company}<br>
              <span style="color: #16a34a; font-size: 14px;">💡 ${job.match_reason}</span><br>
              <a href="${job.job_url}" style="color: #2563eb; text-decoration: none; font-weight: bold;">View Job →</a>
            </li>
          `).join('')}
        </ul>
        <p>Ready to apply? <a href="https://jobpilot.vercel.app/tailor" style="color: #2563eb;">Tailor your resume now</a>.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Sent by JobPilot AI • Your Zero-Cost Job Search Assistant</p>
      `;

      // 4. Send the Email via Resend
      const { data, error } = await resend.emails.send({
        from: 'JobPilot AI <onboarding@resend.dev>', // Sandbox sender
        to: ['rmuhdnazim@gmail.com'], // Sends to the user's email
        subject: '☕ Your 9:00 AM Job Matches are Ready!',
        html: emailHtml,
      });

      if (error) {
        console.error(`Failed to send to ${user.email}:`, error);
      } else {
        console.log(`✅ Email sent to ${user.email}`);
        emailsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), { status: 200 });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}