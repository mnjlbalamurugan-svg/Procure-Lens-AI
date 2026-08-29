import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Compass, ArrowLeft, MessageSquare, Sparkles, User, Cpu } from 'lucide-react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export default function Assistant() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'assistant', 
      text: "Hello! I am your ProcureLens AI Assistant. I can answer any questions regarding proposal specifications, commercial terms compliance, identified risks, or negotiation tactics based on the uploaded documents. Ask me anything!" 
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('Project');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch project title
    api.get(`/api/projects/${id}`)
      .then((res) => setProjectName(res.data.name))
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    // Scroll to bottom on message list change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post(`/api/projects/${id}/assistant`, {
        question: userMessage
      });
      setMessages(prev => [...prev, { sender: 'assistant', text: response.data.answer }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: "I encountered an error connecting to the AI Advisor. Please verify that your backend and Gemini configuration are active." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Which vendor is best and why?",
    "Which vendor is the cheapest?",
    "What is the biggest risk with Vendor B?",
    "What terms should I negotiate with Vendor A?"
  ];

  const handleSampleClick = (q: string) => {
    setInput(q);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main chat window */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
        {/* Background glow */}
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none" />

        {/* Header */}
        <header className="px-8 py-5 border-b border-slate-900 flex justify-between items-center bg-slate-950/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-lg font-extrabold text-slate-50 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
              <span>AI Procurement Assistant</span>
            </h2>
            <p className="text-xs text-indigo-400 mt-0.5">{projectName}</p>
          </div>
          <Link 
            to={`/projects/${id}/dashboard`}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Dashboard</span>
          </Link>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-8 space-y-5">
          <div className="max-w-4xl mx-auto space-y-5">
            
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex items-start space-x-4 animate-fade-in ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Icon */}
                {msg.sender === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-900/50 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Cpu className="h-4.5 w-4.5" />
                  </div>
                )}

                {/* Bubble */}
                <div 
                  className={`p-4 rounded-2xl max-w-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-650 text-white rounded-tr-none'
                      : 'bg-slate-900/50 border border-slate-850 text-slate-250 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* User Icon */}
                {msg.sender === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-350 flex-shrink-0">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Generating Loader */}
            {loading && (
              <div className="flex items-start space-x-4 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-900/50 flex items-center justify-center text-indigo-400">
                  <Cpu className="h-4.5 w-4.5 animate-spin" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-850 text-slate-550 text-xs italic">
                  Advisor is compiling grounded insights from database registers...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Panel */}
        <div className="p-6 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Quick Suggestions (displayed when conversation is quiet) */}
            {messages.length === 1 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Suggested Questions</span>
                <div className="flex flex-wrap gap-2">
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSampleClick(q)}
                      className="bg-slate-900/40 hover:bg-slate-900 hover:text-slate-100 text-slate-400 border border-slate-850 px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex items-center space-x-3.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about pricing limits, delivery times, technical specs, or risks..."
                className="flex-1 bg-slate-900 border border-slate-850 text-slate-100 rounded-xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-900 disabled:text-slate-600 text-white p-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
