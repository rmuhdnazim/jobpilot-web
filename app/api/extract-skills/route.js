export async function POST(request) {
  try {
    const { resumeText } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing AI API Key" }), { status: 500 });
    }

    const prompt = `You are a career analyst. Extract ALL relevant technical skills, soft skills, tools, technologies, and qualifications from this resume. 
   Be thorough - include programming languages, frameworks, databases, cloud platforms, methodologies, certifications, and interpersonal skills.
   Return ONLY a JSON array of strings, like: ["React", "Python", "Project Management", "SQL", "Team Leadership", "AWS", "Docker", "Agile", "Communication"]
    
    Resume:
    """${resumeText}"""`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("GROQ API ERROR:", data);
      return new Response(JSON.stringify({ error: data.error?.message || "AI failed" }), { status: 500 });
    }

    // Clean up the AI response (sometimes it wraps in markdown)
    let skillsText = data.choices[0].message.content.trim();
    skillsText = skillsText.replace(/```json|```/g, '').trim();
    
    const skills = JSON.parse(skillsText);
    return new Response(JSON.stringify({ skills }), { status: 200 });

  } catch (error) {
    console.error("Extract Skills Error:", error);
    return new Response(JSON.stringify({ error: "Failed to extract skills" }), { status: 500 });
  }
}