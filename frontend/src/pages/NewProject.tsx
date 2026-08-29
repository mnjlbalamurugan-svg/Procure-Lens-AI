import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, HelpCircle, Save, Sparkles } from 'lucide-react';
import api from '../services/api';

interface RequirementInput {
  category: string;
  parameter: string;
  required_value: string;
  weight: number;
  mandatory: boolean;
}

export default function NewProject() {
  const navigate = useNavigate();
  
  // Project state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [budget, setBudget] = useState(60000);
  const [currency, setCurrency] = useState('INR');

  // Requirements state
  const [requirements, setRequirements] = useState<RequirementInput[]>([
    { category: 'Commercial', parameter: 'Unit Price', required_value: '<= ₹60000', weight: 30, mandatory: true },
    { category: 'Technical', parameter: 'RAM', required_value: '>= 16GB', weight: 30, mandatory: true },
    { category: 'Warranty', parameter: 'Warranty', required_value: '>= 3 years', weight: 15, mandatory: true },
    { category: 'Delivery', parameter: 'Delivery Time', required_value: '<= 30 days', weight: 10, mandatory: true },
    { category: 'Payment', parameter: 'Payment Terms', required_value: '30-day credit', weight: 10, mandatory: false }
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Commercial', 'Technical', 'Delivery', 'Warranty', 'Payment', 'Contract'];

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      { category: 'Technical', parameter: '', required_value: '', weight: 10, mandatory: false }
    ]);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, field: keyof RequirementInput, value: any) => {
    const updated = [...requirements];
    if (field === 'weight') {
      updated[index][field] = Number(value);
    } else if (field === 'mandatory') {
      updated[index][field] = Boolean(value);
    } else {
      updated[index][field] = String(value);
    }
    setRequirements(updated);
  };

  const totalWeight = requirements.reduce((acc, r) => acc + r.weight, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }
    if (requirements.length === 0) {
      setError('Please add at least one procurement requirement.');
      return;
    }
    // Check if any requirements have empty parameter or values
    const hasEmpty = requirements.some(r => !r.parameter.trim() || !r.required_value.trim());
    if (hasEmpty) {
      setError('All requirements must have a valid Parameter Name and Required Value.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.post('/api/projects', {
        name,
        description,
        quantity,
        budget,
        currency,
        requirements: requirements.map(r => ({
          category: r.category,
          parameter: r.parameter,
          required_value: r.required_value,
          weight: r.weight,
          mandatory: r.mandatory
        }))
      });
      const projectId = response.data.id;
      // Redirect to files upload page
      navigate(`/projects/${projectId}/upload`);
    } catch (err: any) {
      console.error(err);
      setError('Failed to create project. Please verify the backend connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-10 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-900">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Create Procurement Project</h2>
            <p className="text-slate-400 text-sm mt-1">Specify parameters, quantity, budget and evaluation requirements.</p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/70 border border-red-800 text-red-400 text-sm p-4 rounded-xl shadow-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Project Details */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <span>Project Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Project Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Corporate Laptop Procurement Q3"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose, scope, and target specifications..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Target Quantity</label>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Unit Budget Limit</label>
                  <input 
                    type="number" 
                    value={budget} 
                    onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Currency</label>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Requirement Builder */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                <span>Procurement Requirements</span>
              </h3>
              <div className="text-xs text-slate-400">
                Total Weight: <span className="font-semibold text-indigo-400">{totalWeight}</span> (will be normalized to 100%)
              </div>
            </div>

            {/* List of requirements */}
            <div className="space-y-4">
              {requirements.map((req, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-900/40 p-4 rounded-xl border border-slate-900/80 relative group">
                  {/* Category */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Category</label>
                    <select
                      value={req.category}
                      onChange={(e) => updateRequirement(idx, 'category', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 text-slate-200 rounded-md p-2 text-xs focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Parameter name */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Parameter Name</label>
                    <input
                      type="text"
                      value={req.parameter}
                      onChange={(e) => updateRequirement(idx, 'parameter', e.target.value)}
                      placeholder="e.g. RAM capacity"
                      className="w-full bg-slate-900 border border-slate-850 text-slate-200 rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Required value */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider flex items-center justify-between">
                      <span>Required Value</span>
                      <span className="text-[9px] text-slate-500 hover:text-indigo-400 cursor-help" title="Examples: '>= 16GB', '<= 30 days', '30-day credit'">
                        <HelpCircle className="h-3 w-3 inline" />
                      </span>
                    </label>
                    <input
                      type="text"
                      value={req.required_value}
                      onChange={(e) => updateRequirement(idx, 'required_value', e.target.value)}
                      placeholder="e.g. >= 16GB"
                      className="w-full bg-slate-900 border border-slate-850 text-slate-200 rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Weight slider / number */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Weight</label>
                    <input
                      type="number"
                      value={req.weight}
                      onChange={(e) => updateRequirement(idx, 'weight', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 text-slate-200 rounded-md p-2 text-xs focus:outline-none"
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* Mandatory Checkbox */}
                  <div className="sm:col-span-1 flex items-center justify-center h-9">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={req.mandatory}
                        onChange={(e) => updateRequirement(idx, 'mandatory', e.target.checked)}
                        className="rounded bg-slate-900 border-slate-850 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mandatory</span>
                    </label>
                  </div>

                  {/* Delete button */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRequirement(idx)}
                      className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete Requirement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add requirement button */}
            <button
              type="button"
              onClick={addRequirement}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 border-dashed w-full justify-center p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Requirement Field</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 font-semibold px-6 py-3 rounded-xl text-sm transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              {saving ? (
                <span>Creating Project...</span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Configure Proposals</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
