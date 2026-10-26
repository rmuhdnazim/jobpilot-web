"use client";
import { useState, useEffect } from 'react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { supabase } from '../../lib/supabase';
import { useSearchParams } from 'next/navigation';

// FIX: Point to a stable, known-working version of the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function TailorPage() {
  const [currentResume, setCurrentResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tailoredResume, setTailoredResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  
  // NEW: Track the format the user uploaded so we can download in the same format
  const [uploadedFormat, setUploadedFormat] = useState('txt'); 
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const searchParams = useSearchParams();
     useEffect(() => {
     // Check if the URL has a ?job=... parameter
     const jobFromUrl = searchParams.get('job');
     if (jobFromUrl) {
       setJobDescription(jobFromUrl);
       setJdFileName('Pre-filled from job search');
     }
   }, [searchParams]);
  const handleFileUpload = async (event, setText, setFileName, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setText("Reading file...");
    
    // Track if it's pdf or docx for the download button later
    const format = file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
    setUploadedFormat(format);

    try {
      if (format === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value);
      } 
      else if (format === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
        }
        setText(fullText);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setText("Error reading file. Please try copy-pasting the text instead.");
    }
  };

  const handleTailor = async () => {
    if (!currentResume || !jobDescription || currentResume === "Reading file...") {
      alert("Please upload or paste both your resume and the job description!");
      return;
    }

    setLoading(true);
    setTailoredResume('');

    try {
      const response = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentResume, jobDescription }),
      });

      const data = await response.json();
      
      if (data.tailoredResume) {
        setTailoredResume(data.tailoredResume);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Something went wrong talking to the AI.");
    }
    
    setLoading(false);
  };

  // NEW: Smart Download Function
  const handleDownload = async () => {
    if (!tailoredResume) return;

    if (uploadedFormat === 'docx') {
      // Generate .docx
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun({ text: tailoredResume, size: 24 })], // 24 = 12pt font
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "Tailored_Resume.docx");
    } 
    else {
      // Generate .pdf
      const doc = new jsPDF();
      // Split text so it doesn't run off the page (A4 width is ~210mm, 180mm is safe margin)
      const splitText = doc.splitTextToSize(tailoredResume, 180);
      
      // Handle multiple pages if the resume is long
      let y = 15;
      const pageHeight = doc.internal.pageSize.height;
      
      splitText.forEach(line => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
        doc.text(line, 15, y);
        y += 7; // Line height
      });
      
      doc.save("Tailored_Resume.pdf");
    }
  };
const handleSave = async () => {
  setSaveLoading(true);
  setSaveMessage('');

  // 1. Check if the user is actually logged in
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    setSaveMessage('❌ You must be logged in to save your resume.');
    setSaveLoading(false);
    return;
  }

  // 2. Save to the Supabase 'resumes' table
  const { error } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      original_text: currentResume,
      tailored_text: tailoredResume,
      job_description: jobDescription,
    });

  if (error) {
    console.error("Save error:", error);
    setSaveMessage('❌ Failed to save. Check console for details.');
  } else {
    setSaveMessage('✅ Successfully saved to your secure dashboard!');
  }
  
  setSaveLoading(false);
};
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">🤖 AI Resume Tailor</h1>
        <p className="text-center text-gray-500 mb-8">Upload your files and let the AI do the heavy lifting.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left Side: Inputs */}
          <div className="space-y-4">
            
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Your Resume (.pdf or .docx)</label>
              <input 
                type="file" 
                accept=".pdf,.docx"
                onChange={(e) => handleFileUpload(e, setCurrentResume, setResumeFileName, e.target.files[0]?.name.endsWith('.docx') ? 'docx' : 'pdf')}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {resumeFileName && <p className="text-xs text-green-600 mt-1">✅ Loaded: {resumeFileName}</p>}
              <textarea 
                rows="6" 
                value={currentResume} 
                onChange={(e) => setCurrentResume(e.target.value)}
                placeholder="Or paste your resume text here..."
                className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Job Description Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Job Description (.pdf or .docx)</label>
              <input 
                type="file" 
                accept=".pdf,.docx,.txt"
                onChange={(e) => handleFileUpload(e, setJobDescription, setJdFileName, e.target.files[0]?.name.endsWith('.docx') ? 'docx' : 'pdf')}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {jdFileName && <p className="text-xs text-green-600 mt-1">✅ Loaded: {jdFileName}</p>}
              <textarea 
                rows="6" 
                value={jobDescription} 
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Or paste the job description here..."
                className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            <button 
              onClick={handleTailor} 
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400 transition-colors"
            >
              {loading ? '🤖 AI is thinking...' : '✨ Tailor My Resume'}
            </button>
          </div>

          {/* Right Side: Output */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">AI Tailored Resume</label>
            <div className="w-full h-[500px] p-4 border border-gray-300 rounded-lg bg-white overflow-y-auto whitespace-pre-wrap text-sm text-gray-800 shadow-inner">
              {tailoredResume || <span className="text-gray-400 italic">Your tailored resume will appear here...</span>}
            </div>
            
            {/* NEW: Smart Download Button */}
            {tailoredResume && (
              <div className="mt-3 space-y-2">
                <button 
                  onClick={handleDownload}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  📥 Download as {uploadedFormat === 'docx' ? '.docx' : '.pdf'}
                </button>
                
                <button 
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
                >
                  {saveLoading ? 'Saving...' : '💾 Save to My Dashboard'}
                </button>
                
                {saveMessage && (
                  <p className={`text-center text-sm font-medium ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}