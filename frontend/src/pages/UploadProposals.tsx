import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Trash2, CheckCircle2, ChevronRight, Compass, Settings } from 'lucide-react';
import api from '../services/api';

interface UploadedProposal {
  vendor_name: string;
  file_name: string;
  proposal_id: number;
}

export default function UploadProposals() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [proposals, setProposals] = useState<UploadedProposal[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState('');

  useEffect(() => {
    // Fetch project info
    api.get(`/api/projects/${id}`)
      .then((res) => {
        setProjectName(res.data.name);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch project details.');
      });
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Attempt to auto-detect vendor name from file name if empty
      const nameWithoutExt = e.target.files[0].name.split('.')[0];
      if (!vendorName && nameWithoutExt.toLowerCase().startsWith('vendor')) {
        // e.g. vendor_a -> Vendor A
        const parts = nameWithoutExt.replace('_', ' ').replace('-', ' ').split(' ');
        const formatted = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        setVendorName(formatted);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setError('Please specify the Vendor Name.');
      return;
    }
    if (!file) {
      setError('Please select a proposal document to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('vendor_name', vendorName);
    formData.append('file', file);

    try {
      const response = await api.post(`/api/projects/${id}/proposals/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProposals([
        ...proposals,
        {
          vendor_name: response.data.vendor_name,
          file_name: response.data.file_name,
          proposal_id: response.data.proposal_id,
        },
      ]);

      // Reset file form
      setVendorName('');
      setFile(null);
      // Reset input element value
      const fileInput = document.getElementById('proposal-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error(err);
      setError('Failed to upload proposal. Ensure file format is valid.');
    } finally {
      setUploading(false);
    }
  };

  const [activeStepIdx, setActiveStepIdx] = useState(-1);

  const analysisSteps = [
    { id: 1, label: 'Files uploaded', desc: 'Verifying proposal attachments' },
    { id: 2, label: 'Text extracted', desc: 'Parsing PDF, Word, and Excel content' },
    { id: 3, label: 'Vendor information extracted', desc: 'AI mapping specifications' },
    { id: 4, label: 'Requirements checked', desc: 'Validating against user criteria' },
    { id: 5, label: 'Risks identified', desc: 'Auditing payment & delivery details' },
    { id: 6, label: 'Scores calculated', desc: 'Executing deterministic matrix engine' },
    { id: 7, label: 'Recommendation generated', desc: 'Compiling next-step actions center' }
  ];

  const handleAnalyze = async () => {
    if (proposals.length < 2) {
      setError('Please upload at least 2 vendor proposals to run comparative analysis.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setActiveStepIdx(0); // Files uploaded

    // Simulate progress steps incrementing while backend works
    let step = 0;
    const interval = setInterval(() => {
      if (step < 6) {
        step++;
        setActiveStepIdx(step);
      }
    }, 700);

    try {
      await api.post(`/api/projects/${id}/analyze`);
      clearInterval(interval);
      setActiveStepIdx(6); // Ensure all are checked
      setTimeout(() => {
        navigate(`/projects/${id}/dashboard`);
      }, 400);
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setError('An error occurred during AI analysis. Please verify your files and API configuration.');
      setAnalyzing(false);
      setActiveStepIdx(-1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 flex flex-col items-center justify-center relative">
      
      {/* Full screen AI analysis overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6 overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800/80 p-8 rounded-3xl shadow-2xl space-y-6">
            <div className="flex flex-col items-center">
              <Compass className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
              <h3 className="text-xl font-black text-slate-50 tracking-wide">ProcureLens Pipeline Active</h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Running Hybrid Analysis</p>
            </div>

            {/* Checklist interface */}
            <div className="space-y-3.5 text-left border-t border-slate-800/60 pt-5">
              {analysisSteps.map((step, idx) => {
                const isCompleted = activeStepIdx > idx;
                const isActive = activeStepIdx === idx;
                
                return (
                  <div key={step.id} className="flex items-start space-x-3.5 transition-all duration-300">
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <div className="h-4.5 w-4.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-450 flex items-center justify-center text-[10px] font-bold">✓</div>
                      ) : isActive ? (
                        <div className="h-4.5 w-4.5 rounded-full bg-indigo-950 border border-indigo-500/60 text-indigo-400 flex items-center justify-center text-[10px] font-bold animate-pulse">●</div>
                      ) : (
                        <div className="h-4.5 w-4.5 rounded-full bg-slate-950 border border-slate-850 text-slate-700 flex items-center justify-center text-[9px] font-bold">{step.id}</div>
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${
                        isCompleted ? 'text-slate-300 line-through decoration-slate-800' :
                        isActive ? 'text-indigo-400' : 'text-slate-600'
                      }`}>
                        {step.label}
                      </h4>
                      <p className={`text-[9px] ${
                        isActive ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-900">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Configure Vendor Proposals</h2>
            <p className="text-indigo-400 text-sm mt-1">{projectName || 'Project Details'}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Exit
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/70 border border-red-800 text-red-400 text-sm p-4 rounded-xl shadow-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Uploader Form */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
              <UploadCloud className="h-5 w-5 text-indigo-400" />
              <span>Add Proposal</span>
            </h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Vendor Name *</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Vendor A, Dell Corp, Lenovo India"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Proposal Document *</label>
                <div className="border border-slate-800 border-dashed rounded-lg p-6 bg-slate-900/20 text-center flex flex-col items-center justify-center relative hover:bg-slate-900/40 transition-colors">
                  <input
                    type="file"
                    id="proposal-file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.docx,.xlsx,.xls,.txt"
                    required
                  />
                  <FileText className="h-8 w-8 text-slate-500 mb-2" />
                  <span className="text-xs font-medium text-slate-300">
                    {file ? file.name : 'Click to select file'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Supports PDF, DOCX, XLSX, TXT
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-slate-800 hover:bg-slate-750 text-indigo-400 border border-slate-700 font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
              >
                {uploading ? 'Uploading File...' : 'Upload Vendor Proposal'}
              </button>
            </form>
          </div>

          {/* Uploaded Proposals List */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                <span>Uploaded Documents ({proposals.length})</span>
              </h3>

              {proposals.length > 0 ? (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {proposals.map((prop, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-900 rounded-xl">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="bg-indigo-650/10 p-1.5 rounded-lg text-indigo-400 flex-shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-200 truncate">{prop.vendor_name}</h4>
                          <p className="text-[10px] text-slate-500 truncate">{prop.file_name}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-850 text-indigo-400 font-semibold px-2 py-0.5 rounded flex-shrink-0">
                        READY
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 italic text-xs">
                  No proposals uploaded yet. Add at least two vendor proposals to run comparative calculations.
                </div>
              )}
            </div>

            {/* Execute Analysis button */}
            <div className="pt-6 border-t border-slate-900 mt-6">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={proposals.length < 2 || analyzing}
                className="w-full flex items-center justify-center space-x-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-650 disabled:border-slate-900 disabled:shadow-none text-white font-bold py-3.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/15 cursor-pointer"
              >
                <span>Run Procurement Analysis</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              {proposals.length < 2 && (
                <p className="text-center text-[10px] text-slate-500 mt-2.5 font-medium">
                  At least two vendor proposals are required.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
