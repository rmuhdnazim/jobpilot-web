"use client";
import { useState, useEffect } from 'react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { supabase } from '../../lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// FIX: Point to a stable, known-working version of the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// This is the main component that uses useSearchParams
function TailorPageContent() {
  const searchParams = useSearchParams();
  const [currentResume, setCurrentResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tailoredResume, setTailoredResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState('');
  const [jdFileName, setJdFileName] = useState('');
  const [uploadedFormat, setUploadedFormat] = useState('txt');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Auto-fill job description from URL
  useEffect(() => {
    const jobFromUrl = searchParams.get('job');
    if (jobFromUrl) {
      setJobDescription(jobFromUrl);
      setJdFileName('Pre-filled from job search');
    }
  }, [searchParams]);

  // ... keep ALL your existing functions (handleFileUpload, handleTailor, handleDownload, handleSave) exactly as they are ...

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* ... keep ALL your existing JSX exactly as it is ... */}
    </div>
  );
}

// This is the wrapper that provides Suspense
export default function TailorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <TailorPageContent />
    </Suspense>
  );
}