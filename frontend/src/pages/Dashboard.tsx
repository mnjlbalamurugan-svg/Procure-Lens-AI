import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Award, 
  AlertTriangle, 
  HelpCircle, 
  Printer, 
  RefreshCw, 
  TrendingUp, 
  FileText, 
  ArrowRight,
  ShieldAlert,
  ListTodo,
  Info,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import api from '../services/api';
import Sidebar from '../components/Sidebar';
import ComplianceMatrix from '../components/ComplianceMatrix';
import RiskAnalysis from '../components/RiskAnalysis';
import DecisionSimulator from '../components/DecisionSimulator';
import NegotiationEmailModal from '../components/NegotiationEmailModal';

interface Project {
  id: number;
  name: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
}

interface VendorScore {
  vendor_id: number;
  vendor_name: string;
  scores: {
    price: number;
    technical: number;
    warranty: number;
    delivery: number;
    payment: number;
    risk: number;
    total: number;
  };
}

export default function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Page States
  const [project, setProject] = useState<Project | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modals & Sliders
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhyNotModal, setShowWhyNotModal] = useState(false);
  const [whyNotVendor, setWhyNotVendor] = useState<any>(null);
  
  // Simulation sync state
  const [simulatedChampion, setSimulatedChampion] = useState<string>('');
  const [selectedExtractedVendorId, setSelectedExtractedVendorId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [projRes, compRes, risksRes, recRes] = await Promise.all([
        api.get(`/api/projects/${id}`),
        api.get(`/api/projects/${id}/comparison`),
        api.get(`/api/projects/${id}/risks`),
        api.get(`/api/projects/${id}/recommendation`)
      ]);

      setProject(projRes.data);
      setComparison(compRes.data);
      setRisks(risksRes.data);
      setRecommendation(recRes.data);
      
      if (recRes.data && recRes.data.vendor_name) {
        setSimulatedChampion(recRes.data.vendor_name);
      }

      if (compRes.data.vendors && compRes.data.vendors.length > 0) {
        setSelectedExtractedVendorId(compRes.data.vendors[0].vendor_id);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load project analysis dashboard. Verify backend server connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [id]);

  const handleReanalyze = async () => {
    if (!id) return;
    setReanalyzing(true);
    try {
      await api.post(`/api/projects/${id}/analyze`);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError('Re-analysis failed.');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleOpenWhyNot = (vendorName: string) => {
    if (!comparison) return;
    
    // Find vendor data for selected and champion
    const candidate = comparison.vendors.find((v: any) => v.vendor_name.toLowerCase() === vendorName.toLowerCase());
    const champion = comparison.vendors.find((v: any) => v.vendor_name.toLowerCase() === recommendation.vendor_name.toLowerCase());
    
    if (!candidate || !champion) return;
    
    // Build side-by-side requirements comparison
    const comparisonDetails = comparison.requirements.map((req: any) => {
      const candComp = candidate.compliance.find((c: any) => c.requirement_id === req.id);
      const champComp = champion.compliance.find((c: any) => c.requirement_id === req.id);
      return {
        parameter: req.parameter,
        required: req.required_value,
        mandatory: req.mandatory,
        candidateValue: candComp ? candComp.evidence : 'UNKNOWN',
        candidateStatus: candComp ? candComp.status : 'UNKNOWN',
        championValue: champComp ? champComp.evidence : 'UNKNOWN',
        championStatus: champComp ? champComp.status : 'UNKNOWN'
      };
    });

    setWhyNotVendor({
      name: vendorName,
      candidateScore: candidate.scores?.total || 0,
      championName: recommendation.vendor_name,
      championScore: champion.scores?.total || 0,
      details: comparisonDetails
    });
    setShowWhyNotModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-950 items-center justify-center text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-500 italic">Analyzing proposals...</p>
      </div>
    );
  }

  // Map comparison scores data for chart visualization
  const chartData = comparison ? comparison.vendors.map((v: any) => ({
    name: v.vendor_name,
    'Total Score': v.scores?.total || 0,
    'Price Score': v.scores?.price || 0,
    'Technical Compliance': v.scores?.technical || 0,
    'Warranty Coverage': v.scores?.warranty || 0,
    'Delivery Time': v.scores?.delivery || 0,
  })) : [];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950">
        
        {/* Header Block */}
        <header className="px-8 py-5 border-b border-slate-900 flex justify-between items-center z-10 sticky top-0 bg-slate-950/80 backdrop-blur-md no-print">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-slate-50">{project?.name}</h2>
              <span className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold px-2 py-0.5 rounded">
                Qty: {project?.quantity} | Budget Limit: {project?.currency} {project?.budget}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{project?.description}</p>
          </div>
          
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 bg-slate-905 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold px-4.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Report</span>
            </button>
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center space-x-1.5 bg-indigo-650 hover:bg-indigo-550 text-white font-bold px-4.5 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
              <span>{reanalyzing ? 'Re-analyzing...' : 'Run Analysis'}</span>
            </button>
          </div>
        </header>

        {/* Dashboard Grid Content */}
        <main className="p-8 space-y-8 animate-fade-in print:p-0 print:space-y-6">
          
          {/* Printable Report Header */}
          <div className="hidden print:block border-b border-black pb-4 mb-4 text-black">
            <h1 className="text-2xl font-bold">ProcureLens AI Analysis Report</h1>
            <p className="text-sm mt-1">Project: {project?.name}</p>
            <p className="text-xs mt-0.5">Budget Threshold: {project?.currency} {project?.budget} | Qty: {project?.quantity}</p>
          </div>

          {error && (
            <div className="bg-red-955/65 border border-red-800 text-red-400 text-xs p-4 rounded-xl shadow-lg">
              {error}
            </div>
          )}

          {/* Section 1: Champion Vendor Recommendation & Score charts */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Champion Card */}
            <div className="xl:col-span-5 bg-gradient-to-br from-indigo-950/20 via-slate-900/30 to-slate-900/10 border border-indigo-900/40 p-6 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden print:border-black">
              {/* Blur accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3.5 mb-4 print:border-black">
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-indigo-400" />
                    <span className="font-extrabold text-xs text-indigo-400 tracking-wider uppercase">Champion Vendor Selection</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-semibold uppercase block leading-none">AI Fit Score</span>
                    <span className="font-extrabold text-2xl text-white leading-none">
                      {recommendation?.total_score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">/100</span>
                  </div>
                </div>

                <h3 className="font-black text-2xl text-slate-50">{recommendation?.vendor_name}</h3>
                
                {/* AI explanation summary */}
                <p className="text-xs text-slate-350 leading-relaxed mt-3.5 italic bg-slate-950/40 p-4 rounded-xl border border-slate-900 print:bg-none print:border-black">
                  "{recommendation?.summary}"
                </p>
                
                {/* Strengths & Weaknesses lists */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Key Strengths</h5>
                    <ul className="space-y-1 text-slate-300 text-xs">
                      {recommendation?.strengths?.map((str: string, i: number) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-emerald-450 mt-0.5">✓</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Concerns / Warnings</h5>
                    <ul className="space-y-1 text-slate-300 text-xs">
                      {recommendation?.concerns?.map((con: string, i: number) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-amber-450 mt-0.5">⚠</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Center - Next Steps */}
              <div className="mt-6 border-t border-slate-900 pt-5 print:border-black">
                <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <ListTodo className="h-4 w-4 text-indigo-400" />
                  <span>Action Center: Next Steps</span>
                </h5>
                <div className="space-y-2 mb-5">
                  {recommendation?.recommended_actions?.map((act: string, i: number) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-slate-350">
                      <span className="bg-slate-900 border border-slate-800 text-[10px] font-bold h-4.5 w-4.5 flex items-center justify-center rounded-full mt-0.5 text-indigo-400 flex-shrink-0">
                        {i + 1}
                      </span>
                      <p>{act}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-3.5 no-print">
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 font-bold py-2.5 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Generate Negotiation Email
                  </button>
                  {comparison?.vendors?.length > 1 && (
                    <button
                      onClick={() => handleOpenWhyNot('Vendor C')}
                      className="text-slate-400 hover:text-slate-200 text-xs font-semibold px-2.5 py-2 cursor-pointer"
                    >
                      Why not Vendor C?
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Score Comparison Chart */}
            <div className="xl:col-span-7 bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between print:border-black">
              <div>
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-2">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Score Comparison Matrix</span>
                </h4>
                <p className="text-[10px] text-slate-500">Comparative representation across commercial, compliance, and delivery performance metrics.</p>
              </div>

              <div className="h-72 w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="Total Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Price Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Technical Compliance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Warranty Coverage" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Section 2: Compliance Grid Matrix */}
          <div className="space-y-3.5">
            <div>
              <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="h-4.5 w-4.5 text-indigo-400" />
                <span>Line-Item Compliance Matrix</span>
              </h4>
              <p className="text-[10px] text-slate-500">Interactive compliance checkpoints. Click individual cells to inspect grounding quotes and explanations.</p>
            </div>
            
            {comparison && (
              <ComplianceMatrix 
                requirements={comparison.requirements} 
                vendors={comparison.vendors} 
              />
            )}
          </div>

          {/* Section 3: Risk Registry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-3.5">
              <div>
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
                  <span>Audit Risk Registry</span>
                </h4>
                <p className="text-[10px] text-slate-500">Uncovered deviations, hidden charges, and payment term compliance gaps.</p>
              </div>
              
              <RiskAnalysis risks={risks} />
            </div>

            {/* Assistant Chat Panel Preview */}
            <div className="lg:col-span-6 bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between print:hidden">
              <div>
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider mb-2">
                  AI Procurement Advisor
                </h4>
                <p className="text-[10px] text-slate-500">Ask the advisor specific compliance queries. grounded strictly in stored analysis logs.</p>
              </div>

              <div className="bg-slate-950 border border-slate-900 p-4.5 rounded-xl mt-4.5 flex-1 flex flex-col justify-center items-center text-center space-y-3">
                <p className="text-xs text-slate-400 max-w-sm">
                  Want to ask: "Which vendor has the best warranty?" or "Why was {recommendation?.vendor_name || 'Vendor B'} recommended?"
                </p>
                <button
                  onClick={() => navigate(`/projects/${id}/assistant`)}
                  className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Open Assistant Chat</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section: Extracted Proposal Data & Raw Text Verification */}
          <div className="space-y-4 pt-4 border-t border-slate-900/60 print:hidden animate-fade-in">
            <div>
              <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="h-4.5 w-4.5 text-indigo-400" />
                <span>Extracted Proposal Data & Source Text</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Verify AI extraction results, confidence parameters, and review the parsed raw text directly from the uploaded files.
              </p>
            </div>

            {comparison && comparison.vendors && comparison.vendors.length > 0 && (
              <div className="glass-card p-6 rounded-2xl space-y-6">
                {/* Selector Tabs */}
                <div className="flex border-b border-slate-800 pb-2 overflow-x-auto space-x-2">
                  {comparison.vendors.map((v: any) => (
                    <button
                      key={v.vendor_id}
                      type="button"
                      onClick={() => setSelectedExtractedVendorId(v.vendor_id)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedExtractedVendorId === v.vendor_id
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                          : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/50'
                      }`}
                    >
                      {v.vendor_name}
                    </button>
                  ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Extracted Key/Values */}
                  <div className="space-y-4">
                    <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">AI Extracted Parameters</h5>
                    <div className="overflow-hidden border border-slate-900 rounded-xl bg-slate-950/20">
                      <table className="min-w-full divide-y divide-slate-900 text-left text-xs">
                        <thead className="bg-slate-900/40 text-slate-400 font-semibold text-[10px] uppercase">
                          <tr>
                            <th className="px-4 py-3">Parameter / Field</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3 text-right">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/50 text-[11px]">
                          {(() => {
                            const activeId = selectedExtractedVendorId || (comparison.vendors && comparison.vendors.length > 0 ? comparison.vendors[0].vendor_id : null);
                            const vendor = comparison.vendors.find((v: any) => v.vendor_id === activeId);
                            if (!vendor || !vendor.extracted_data || vendor.extracted_data.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={3} className="px-4 py-6 text-center text-slate-550 italic">
                                    No extracted specifications available.
                                  </td>
                                </tr>
                              );
                            }
                            return vendor.extracted_data.map((item: any, i: number) => {
                              const isHigh = item.confidence >= 0.9;
                              const confPercent = Math.round(item.confidence * 100);
                              return (
                                <tr key={i} className="hover:bg-slate-900/10">
                                  <td className="px-4 py-2.5 font-bold text-slate-300 capitalize">
                                    {item.field.replace(/_/g, ' ')}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-200 break-words max-w-[200px]">
                                    {item.value}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                                      isHigh 
                                        ? 'bg-emerald-950/30 text-emerald-450 border border-emerald-900/40' 
                                        : 'bg-amber-950/30 text-amber-450 border border-amber-900/40'
                                    }`}>
                                      {confPercent}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Source Document Text */}
                  <div className="space-y-4">
                    <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Raw Extracted Document Text</h5>
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl max-h-[310px] overflow-y-auto font-mono text-[10px] text-slate-450 leading-relaxed whitespace-pre-wrap">
                      {(() => {
                        const activeId = selectedExtractedVendorId || (comparison.vendors && comparison.vendors.length > 0 ? comparison.vendors[0].vendor_id : null);
                        const vendor = comparison.vendors.find((v: any) => v.vendor_id === activeId);
                        return vendor?.extracted_text || 'No text extracted from this proposal.';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Decision Simulator */}
          <div className="space-y-4 pt-4 border-t border-slate-900/60 print:hidden">
            <div>
              <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                What-If Decision Simulator
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Adjust sliders to customize parameter significance. Dynamic score updates map directly to your priorities.</p>
            </div>
            
            {id && (
              <DecisionSimulator 
                projectId={id} 
                onSimulateChange={(best) => setSimulatedChampion(best)}
              />
            )}
          </div>

        </main>
      </div>

      {/* Negotiation Email Overlay Modal */}
      {showEmailModal && (
        <NegotiationEmailModal
          projectId={id || ''}
          vendorId={recommendation?.vendor_id || null}
          vendorName={recommendation?.vendor_name || ''}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Why Not Vendor C Overlay Modal */}
      {showWhyNotModal && whyNotVendor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">Champion Comparison Analysis</h4>
                <p className="text-white font-bold text-base mt-0.5">
                  Why not {whyNotVendor.name}?
                </p>
              </div>
              <button 
                onClick={() => setShowWhyNotModal(false)}
                className="text-slate-450 hover:text-slate-200 p-1 bg-slate-805 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex items-center justify-between text-xs text-slate-350">
                <p>
                  <span className="font-bold text-white">{whyNotVendor.championName} (Champion)</span> scored <span className="font-extrabold text-indigo-400">{whyNotVendor.championScore}/100</span>, while <span className="font-bold text-white">{whyNotVendor.name}</span> scored <span className="font-bold text-rose-450">{whyNotVendor.candidateScore}/100</span>.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Side-by-side comparison</h5>
                <div className="overflow-hidden border border-slate-900 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-900 text-left text-xs">
                    <thead className="bg-slate-900/40 text-slate-400 font-semibold text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3 text-center">Required Target</th>
                        <th className="px-4 py-3 text-center">{whyNotVendor.championName} (Champion)</th>
                        <th className="px-4 py-3 text-center">{whyNotVendor.name}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-[11px]">
                      {whyNotVendor.details.map((row: any, i: number) => {
                        const candFail = row.candidateStatus === 'FAIL';
                        return (
                          <tr key={i} className="hover:bg-slate-900/10">
                            <td className="px-4 py-3 font-bold text-slate-200">
                              {row.parameter} {row.mandatory && <span className="text-rose-450 text-[9px] font-normal">(Mandatory)</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-400 font-semibold">{row.required}</td>
                            <td className="px-4 py-3 text-center text-emerald-450 font-bold bg-emerald-950/5">
                              {row.championValue}
                            </td>
                            <td className={`px-4 py-3 text-center font-bold ${candFail ? 'text-rose-450 bg-rose-950/10' : 'text-slate-300'}`}>
                              {row.candidateValue} {candFail && ' ✗'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-rose-950/10 border border-rose-900/30 p-4.5 rounded-xl space-y-1.5">
                <span className="font-bold text-rose-400 text-[10px] uppercase tracking-wider block">Decision Failure Details</span>
                <p className="text-xs text-slate-350 leading-relaxed">
                  While {whyNotVendor.name} offers a lower base price (₹54,000), it fails multiple mandatory conditions: RAM size (8GB vs required 16GB), Warranty duration (2 years vs required 3 years), and Delivery timeline (45 days vs required 30 days). Therefore, the commercial discount does not justify the core requirement deficiencies.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-900 text-right">
              <button
                onClick={() => setShowWhyNotModal(false)}
                className="bg-indigo-650 hover:bg-indigo-550 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
