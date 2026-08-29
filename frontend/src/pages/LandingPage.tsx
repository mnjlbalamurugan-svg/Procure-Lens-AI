import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Sparkles, UploadCloud, CheckCircle2, ShieldAlert, Cpu, ArrowRight, Play } from 'lucide-react';
import api from '../services/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTryDemo = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      // Trigger database seed endpoint
      const response = await api.get('/api/projects/demo/load');
      const projectId = response.data.project_id;
      
      // Automatically trigger analysis to make sure all tables are fully populated
      await api.post(`/api/projects/${projectId}/analyze`);
      
      // Redirect to the dashboard of seeded project
      navigate(`/projects/${projectId}/dashboard`);
    } catch (err: any) {
      console.error('Failed to load demo:', err);
      setError('Could not connect to the backend server. Please verify the FastAPI backend is running on port 8000.');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-900/20 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center border-b border-slate-900 z-10">
        <div className="flex items-center space-x-2.5">
          <Compass className="h-8 w-8 text-indigo-500" />
          <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">ProcureLens AI</span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleTryDemo}
            disabled={loadingDemo}
            className="text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors"
          >
            {loadingDemo ? 'Loading...' : 'Demo Sandbox'}
          </button>
          <button 
            onClick={() => navigate('/projects/new')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
          >
            New Analysis
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 text-center max-w-5xl mx-auto z-10 animate-fade-in">
        
        {/* Hackathon Badge */}
        <div className="inline-flex items-center space-x-2 bg-indigo-950/80 border border-indigo-850 text-indigo-400 font-semibold px-4 py-1.5 rounded-full text-xs mb-8 tracking-wide shadow-inner">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ProcureLens AI — Hackathon MVP Sandbox</span>
        </div>

        {/* Headlines */}
        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Make Better Procurement Decisions with AI
        </h2>
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl leading-relaxed">
          Upload vendor proposals, uncover hidden compliance risks, compare complex technical requirements, and get deterministic, explainable recommendations in minutes.
        </p>

        {/* Display Error if Server is Offline */}
        {error && (
          <div className="mt-6 bg-red-950/80 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg max-w-2xl font-medium shadow-lg">
            {error}
          </div>
        )}

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-5 w-full sm:w-auto">
          <button 
            onClick={handleTryDemo}
            disabled={loadingDemo}
            className="flex items-center justify-center space-x-2.5 w-full sm:w-auto bg-gradient-to-r from-indigo-650 to-blue-600 hover:from-indigo-550 hover:to-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-indigo-600/25 group text-base cursor-pointer"
          >
            {loadingDemo ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Preparing Sandbox Data...</span>
              </span>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                <span>TRY LIVE DEMO (60s)</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
          <button 
            onClick={() => navigate('/projects/new')}
            className="flex items-center justify-center w-full sm:w-auto bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 font-semibold px-8 py-4 rounded-xl transition-all text-base cursor-pointer"
          >
            Start Procurement Analysis
          </button>
        </div>

        {/* Workflow Section */}
        <section className="mt-28 w-full">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-12">How it works</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            {/* Step 1 */}
            <div className="glass-card p-6 rounded-2xl relative">
              <div className="h-10 w-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mb-5 border border-indigo-500/20 font-bold">1</div>
              <h4 className="font-bold text-base text-slate-100">Upload Proposals</h4>
              <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                Provide vendor documents (PDF, Word, or Excel). Text content is parsed and cleaned automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card p-6 rounded-2xl relative">
              <div className="h-10 w-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mb-5 border border-indigo-500/20 font-bold">2</div>
              <h4 className="font-bold text-base text-slate-100">Extract Specs</h4>
              <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                Structured information mapping. Our AI extracts prices, warranties, timelines, and technical specs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card p-6 rounded-2xl relative">
              <div className="h-10 w-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mb-5 border border-indigo-500/20 font-bold">3</div>
              <h4 className="font-bold text-base text-slate-100">Deterministic Scoring</h4>
              <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                Proposals are ranked. A mathematical compliance calculation runs on weights, NOT arbitrary AI scores.
              </p>
            </div>

            {/* Step 4 */}
            <div className="glass-card p-6 rounded-2xl relative">
              <div className="h-10 w-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mb-5 border border-indigo-500/20 font-bold">4</div>
              <h4 className="font-bold text-base text-slate-100">Negotiate & Decide</h4>
              <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                Review risks, simulate weight modifications, generate negotiation emails, and export summaries.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-600 border-t border-slate-900 z-10">
        <p>© 2026 ProcureLens AI. All rights reserved. Transparent procurement insights through grounded AI logic.</p>
      </footer>
    </div>
  );
}
