export async function POST(request) {
  try {
    // 1. Get the data the user sent us
    const { jobDescription, currentResume } = await request.json();

    // 2. Check if we have our secret VIP pass
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing AI API Key in environment variables" }), { status: 500 });
    }

    // 3. Create the "Prompt"
    const prompt = `You are an expert resume writer. 
    Here is the user's current resume: 
    """${currentResume}""" 
    
    Here is the job description they want to apply for: 
    """${jobDescription}""" 
    
    Rewrite the user's resume to perfectly match the job description. Highlight relevant skills, use keywords from the job description, and make it sound professional. Output ONLY the tailored resume text, no extra conversational filler.`;

    // 4. Talk to the Groq AI
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b", 
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.5, 
      }),
    });

    const data = await response.json();
    
    // 🚨 NEW: CATCH THE AI'S ERROR AND PRINT IT
    if (!response.ok) {
      console.error("🔴 GROQ API ERROR:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "Groq API failed" }), { status: 500 });
    }

    // 5. Extract the AI's answer and send it back
    const tailoredResume = data.choices[0].message.content;
    return new Response(JSON.stringify({ tailoredResume }), { status: 200 });

  } catch (error) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: "Failed to tailor resume" }), { status: 500 });
  }
}