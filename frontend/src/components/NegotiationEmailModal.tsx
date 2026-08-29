import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, X, Compass } from 'lucide-react';
import api from '../services/api';

interface Props {
  projectId: string;
  vendorId: number | null;
  vendorName: string;
  onClose: () => void;
}

export default function NegotiationEmailModal({ projectId, vendorId, vendorName, onClose }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;

    setLoading(true);
    setError(null);
    api.post(`/api/projects/${projectId}/negotiation-email`, { vendor_id: vendorId })
      .then((res) => {
        setSubject(res.data.subject);
        setBody(res.data.body);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to generate negotiation email.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId, vendorId]);

  const handleCopy = () => {
    const textToCopy = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
      <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-900 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <Mail className="h-5 w-5 text-indigo-400" />
            <div>
              <h4 className="text-white font-extrabold text-sm uppercase tracking-wider">Negotiation Email Composer</h4>
              <p className="text-xs text-slate-400 mt-0.5">Grounded email addressing specific compliance risks for {vendorName}.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-450 hover:text-slate-200 p-1 bg-slate-805 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-955/60 border border-red-800 text-red-400 text-xs p-3.5 rounded-lg font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Compass className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-500 italic">Drafting custom terms proposal...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Subject</label>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 text-slate-100 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Email Body</label>
                <textarea 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full bg-slate-950 border border-slate-900 text-slate-250 rounded-lg p-4 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-900 flex justify-between items-center">
          <span className="text-[10px] text-slate-550 italic font-medium">
            Please edit and review before sending.
          </span>
          <div className="flex items-center space-x-3.5">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xs font-semibold px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || !body}
              className="flex items-center space-x-1.5 bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-900 disabled:text-slate-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Subject & Body</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
