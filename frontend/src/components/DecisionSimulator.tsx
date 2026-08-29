import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, Award, ArrowUp, Info } from 'lucide-react';
import api from '../services/api';

interface SimulationResult {
  vendor_id: number;
  vendor_name: string;
  scores: Record<string, number>;
  total_score: number;
}

interface Props {
  projectId: string;
  onSimulateChange?: (bestVendorName: string) => void;
}

export default function DecisionSimulator({ projectId, onSimulateChange }: Props) {
  // Slider states
  const [price, setPrice] = useState(30);
  const [technical, setTechnical] = useState(30);
  const [warranty, setWarranty] = useState(15);
  const [delivery, setDelivery] = useState(10);
  const [payment, setPayment] = useState(10);
  const [risk, setRisk] = useState(5);

  const [results, setResults] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const totalSliderSum = price + technical + warranty + delivery + payment + risk;

  // Normalized percentages helper
  const getNormalized = (val: number) => {
    if (totalSliderSum === 0) return 0;
    return Math.round((val / totalSliderSum) * 100);
  };

  const fetchSimulation = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/api/projects/${projectId}/simulate`, {
        price_weight: price,
        technical_weight: technical,
        warranty_weight: warranty,
        delivery_weight: delivery,
        payment_weight: payment,
        risk_weight: risk
      });
      setResults(response.data);
      if (response.data.length > 0 && onSimulateChange) {
        onSimulateChange(response.data[0].vendor_name);
      }
    } catch (err) {
      console.error('Failed to run simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run simulation whenever weights change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSimulation();
    }, 150); // Slight debounce to prevent flooded requests
    return () => clearTimeout(delayDebounce);
  }, [price, technical, warranty, delivery, payment, risk, projectId]);

  const handleReset = () => {
    setPrice(30);
    setTechnical(30);
    setWarranty(15);
    setDelivery(10);
    setPayment(10);
    setRisk(5);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Sliders Panel */}
      <div className="md:col-span-6 bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Sliders className="h-4.5 w-4.5 text-indigo-400" />
            <span>Evaluation Criteria Weights</span>
          </h4>
          <button 
            onClick={handleReset}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 uppercase"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Price */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-350">Commercial (Price)</span>
              <span className="text-indigo-400">{getNormalized(price)}% <span className="text-[10px] text-slate-550">({price})</span></span>
            </div>
            <input 
              type="range" min="0" max="100" value={price} 
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Technical */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-350">Technical Specifications</span>
              <span className="text-indigo-400">{getNormalized(technical)}% <span className="text-[10px] text-slate-550">({technical})</span></span>
            </div>
            <input 
              type="range" min="0" max="100" value={technical} 
              onChange={(e) => setTechnical(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Warranty */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-350">Warranty Support</span>
              <span className="text-indigo-400">{getNormalized(warranty)}% <span className="text-[10px] text-slate-550">({warranty})</span></span>
            </div>
            <input 
              type="range" min="0" max="100" value={warranty} 
              onChange={(e) => setWarranty(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Delivery */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-350">Delivery Timelines</span>
              <span className="text-indigo-400">{getNormalized(delivery)}% <span className="text-[10px] text-slate-550">({delivery})</span></span>
            </div>
            <input 
              type="range" min="0" max="100" value={delivery} 
              onChange={(e) => setDelivery(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Payment */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-350">Payment Terms</span>
              <span className="text-indigo-400">{getNormalized(payment)}% <span className="text-[10px] text-slate-550">({payment})</span></span>
            </div>
            <input 
              type="range" min="0" max="100" value={payment} 
              onChange={(e) => setPayment(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Risk */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-350">Risk Containment</span>
              <span className="text-indigo-400">{getNormalized(risk)}% <span className="text-[10px] text-slate-550">({risk})</span></span>
            </div>
            <input 
              type="range" min="0" max="100" value={risk} 
              onChange={(e) => setRisk(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-[10px] text-slate-500 flex items-start space-x-1.5">
          <Info className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Changing sliders immediately recalculates scores mathematically on the backend. The AI does not compute these values, providing a fully transparent audit trail.
          </p>
        </div>
      </div>

      {/* Dynamic Score Rankings */}
      <div className="md:col-span-6 bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col">
        <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3 mb-4">
          Live Recalculated Rankings
        </h4>

        {loading && results.length === 0 ? (
          <div className="text-center py-12 text-slate-500 italic text-xs flex-1 flex items-center justify-center">
            Recalculating scores...
          </div>
        ) : (
          <div className="space-y-3.5 flex-1">
            {results.map((vendor, idx) => {
              const isBest = idx === 0;
              return (
                <div 
                  key={vendor.vendor_id}
                  className={`p-4 rounded-xl border relative transition-all duration-200 ${
                    isBest 
                      ? 'bg-gradient-to-r from-indigo-950/20 to-slate-900/30 border-indigo-500/40 shadow-md shadow-indigo-950/20' 
                      : 'bg-slate-900/20 border-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isBest ? 'bg-indigo-650 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-250 flex items-center space-x-1.5">
                          <span>{vendor.vendor_name}</span>
                          {isBest && (
                            <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/50 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider flex items-center space-x-1">
                              <Award className="h-2.5 w-2.5" />
                              <span>Champion</span>
                            </span>
                          )}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Price: {vendor.scores.price} | Tech: {vendor.scores.technical} | Risk: {vendor.scores.risk}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`font-extrabold text-sm ${isBest ? 'text-indigo-400' : 'text-slate-350'}`}>
                        {vendor.total_score}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-semibold">/ 100</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
