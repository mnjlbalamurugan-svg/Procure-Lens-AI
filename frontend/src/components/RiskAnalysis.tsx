import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Info, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Risk {
  id: number;
  vendor_id: number;
  vendor_name: string;
  type: string;
  severity: string; // HIGH, MEDIUM, LOW
  description: string;
  recommendation: string;
  evidence: string;
}

interface Props {
  risks: Risk[];
}

export default function RiskAnalysis({ risks }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'HIGH':
        return 'bg-rose-950/45 text-rose-450 border border-rose-900/60';
      case 'MEDIUM':
        return 'bg-amber-950/45 text-amber-450 border border-amber-900/60';
      default:
        return 'bg-blue-950/45 text-blue-450 border border-blue-900/60';
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'HIGH':
        return <ShieldAlert className="h-5 w-5 text-rose-500 flex-shrink-0 animate-bounce" />;
      case 'MEDIUM':
        return <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const getCardBorder = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'HIGH':
        return 'border-rose-950/60 hover:border-rose-800/40 bg-rose-950/5';
      case 'MEDIUM':
        return 'border-amber-950/60 hover:border-amber-800/40 bg-amber-950/5';
      default:
        return 'border-blue-950/60 hover:border-blue-800/40 bg-blue-950/5';
    }
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  if (risks.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
        <ShieldCheck className="h-10 w-10 text-emerald-500 mb-3" />
        <h4 className="font-bold text-sm text-slate-200">No Major Risks Detected</h4>
        <p className="text-slate-500 text-xs mt-1 max-w-sm">All uploaded proposals comply with essential safety, payment, and delivery baselines.</p>
      </div>
    );
  }

  // Sort risks so High is first, then Medium, then Low
  const sortedRisks = [...risks].sort((a, b) => {
    const weights: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return (weights[b.severity.toUpperCase()] || 0) - (weights[a.severity.toUpperCase()] || 0);
  });

  return (
    <div className="space-y-3">
      {sortedRisks.map((risk) => {
        const isExpanded = expandedId === risk.id;
        return (
          <div
            key={risk.id}
            className={`border rounded-xl transition-all glass-card duration-250 cursor-pointer overflow-hidden ${getCardBorder(risk.severity)}`}
            onClick={() => toggleExpand(risk.id)}
          >
            {/* Summary Row */}
            <div className="p-4 flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3.5 min-w-0">
                {getSeverityIcon(risk.severity)}
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-100">{risk.vendor_name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${getSeverityBadge(risk.severity)}`}>
                      {risk.severity} Risk
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-900 px-1.5 py-0.2 rounded">{risk.type}</span>
                  </div>
                  <p className="text-xs text-slate-350 truncate mt-1.5 pr-2 max-w-xl">{risk.description}</p>
                </div>
              </div>
              <div>
                {isExpanded ? (
                  <ChevronUp className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-11 pb-5 pt-1 border-t border-slate-900/60 bg-slate-900/10 space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                {/* Description */}
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-400 block mb-1">Details</span>
                  {risk.description}
                </div>

                {/* Evidence Quote */}
                {risk.evidence && risk.evidence !== 'NOT_SPECIFIED' && (
                  <div>
                    <span className="font-bold text-slate-400 block mb-1 text-[10px] uppercase tracking-wider">Supporting Quote / Evidence</span>
                    <div className="bg-slate-950 text-slate-400 font-mono text-[11px] p-3 rounded-lg border border-slate-900 italic">
                      "{risk.evidence}"
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                {risk.recommendation && (
                  <div className="bg-indigo-950/20 border border-indigo-900/30 p-3.5 rounded-lg">
                    <span className="font-bold text-indigo-400 block text-[10px] uppercase tracking-wider mb-1">Procurement Action Recommendation</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{risk.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
