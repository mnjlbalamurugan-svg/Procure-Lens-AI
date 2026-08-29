import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Info, X } from 'lucide-react';

interface Requirement {
  id: number;
  category: string;
  parameter: string;
  required_value: string;
  weight: number;
  mandatory: boolean;
}

interface ComplianceItem {
  requirement_id: number;
  status: string;
  explanation: string;
  evidence: string;
}

interface VendorData {
  vendor_id: number;
  vendor_name: string;
  has_proposal: boolean;
  compliance: ComplianceItem[];
}

interface Props {
  requirements: Requirement[];
  vendors: VendorData[];
}

export default function ComplianceMatrix({ requirements, vendors }: Props) {
  const [selectedCell, setSelectedCell] = useState<{
    vendorName: string;
    parameter: string;
    required: string;
    status: string;
    explanation: string;
    evidence: string;
    mandatory: boolean;
  } | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'MATCH':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'PARTIAL':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'FAIL':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-slate-550" />;
    }
  };

  const getCellBg = (status: string) => {
    switch (status.toUpperCase()) {
      case 'MATCH':
        return 'bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-900/40 text-emerald-350 cursor-pointer';
      case 'PARTIAL':
        return 'bg-amber-950/20 hover:bg-amber-950/30 border border-amber-900/40 text-amber-350 cursor-pointer';
      case 'FAIL':
        return 'bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/40 text-rose-350 cursor-pointer';
      default:
        return 'bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/60 text-slate-400 cursor-pointer';
    }
  };

  const handleCellClick = (vendor: VendorData, req: Requirement) => {
    const comp = vendor.compliance.find(c => c.requirement_id === req.id);
    if (!comp) return;

    setSelectedCell({
      vendorName: vendor.vendor_name,
      parameter: req.parameter,
      required: req.required_value,
      status: comp.status,
      explanation: comp.explanation,
      evidence: comp.evidence,
      mandatory: req.mandatory
    });
  };

  return (
    <div className="space-y-4">
      {/* Scrollable table container */}
      <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40">
        <table className="min-w-full divide-y divide-slate-900 text-left text-xs">
          <thead className="bg-slate-900/70">
            <tr>
              <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Requirement</th>
              <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-center">Required Target</th>
              {vendors.map((v) => (
                <th key={v.vendor_id} className="px-6 py-4 font-bold text-slate-350 uppercase tracking-wider text-center">
                  {v.vendor_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/50">
            {requirements.map((req) => (
              <tr key={req.id} className="hover:bg-slate-900/10 transition-colors">
                <td className="px-6 py-4.5">
                  <div className="font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                    <span>{req.parameter}</span>
                    {req.mandatory && (
                      <span className="bg-rose-950/40 text-rose-450 border border-rose-900/40 font-bold text-[9px] px-1.5 py-0.2 rounded uppercase">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{req.category} (Weight: {req.weight}%)</div>
                </td>
                <td className="px-6 py-4.5 text-center font-semibold text-slate-300">
                  {req.required_value}
                </td>
                {vendors.map((vendor) => {
                  const comp = vendor.compliance.find(c => c.requirement_id === req.id);
                  if (!comp) {
                    return (
                      <td key={vendor.vendor_id} className="px-6 py-4.5 text-center text-slate-600 italic">
                        No Proposal
                      </td>
                    );
                  }
                  return (
                    <td key={vendor.vendor_id} className="px-6 py-4.5 text-center">
                      <button
                        onClick={() => handleCellClick(vendor, req)}
                        className={`inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] w-32 ${getCellBg(comp.status)}`}
                      >
                        {getStatusIcon(comp.status)}
                        <span>{comp.status}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Explanatory Overlay Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider">Compliance Evidence</h4>
                <p className="text-white font-bold text-base mt-0.5">
                  {selectedCell.vendorName} — {selectedCell.parameter}
                </p>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="text-slate-450 hover:text-slate-200 p-1 bg-slate-800 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="flex items-center space-x-4 bg-slate-900/40 p-3.5 rounded-xl border border-slate-900">
                <div className="text-xs text-slate-500">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Requirement</div>
                  <span className="font-semibold text-slate-350">{selectedCell.required}</span>
                </div>
                <div className="h-6 border-r border-slate-800" />
                <div className="text-xs">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Status</div>
                  <span className={`font-bold uppercase inline-flex items-center space-x-1 ${
                    selectedCell.status === 'MATCH' ? 'text-emerald-450' : 
                    selectedCell.status === 'PARTIAL' ? 'text-amber-450' : 'text-rose-450'
                  }`}>
                    {getStatusIcon(selectedCell.status)}
                    <span className="ml-1">{selectedCell.status}</span>
                  </span>
                </div>
                {selectedCell.mandatory && (
                  <>
                    <div className="h-6 border-r border-slate-800" />
                    <span className="bg-rose-950/40 text-rose-400 border border-rose-900/40 font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                      Mandatory
                    </span>
                  </>
                )}
              </div>

              {/* Grounded Evidence Quote */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supporting Evidence from Proposal</label>
                <div className="bg-slate-950 border border-slate-900 text-slate-300 font-mono text-xs p-4 rounded-xl italic relative before:content-['“'] before:absolute before:text-slate-850 before:text-5xl before:top-2 before:left-2 pl-7">
                  {selectedCell.evidence || 'Not explicitly specified.'}
                </div>
              </div>

              {/* AI Explanation */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Explanation</label>
                <p className="text-xs text-slate-350 leading-relaxed bg-slate-900/10 p-3 rounded-lg border border-slate-900/30">
                  {selectedCell.explanation || 'No explanation provided.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-900 text-right">
              <button
                onClick={() => setSelectedCell(null)}
                className="bg-indigo-650 hover:bg-indigo-550 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Close Insights
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
