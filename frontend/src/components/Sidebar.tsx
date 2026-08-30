import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  PlusCircle, 
  Settings, 
  Compass, 
  Database,
  ArrowLeft,
  Activity,
  LogOut
} from 'lucide-react';
import api from '../services/api';

interface Project {
  id: number;
  name: string;
}

export default function Sidebar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Select Project');

  const handleLogout = () => {
    localStorage.removeItem('procure_token');
    navigate('/login');
  };

  useEffect(() => {
    // Fetch project list
    api.get('/api/projects')
      .then((res) => {
        setProjects(res.data);
        if (id) {
          const proj = res.data.find((p: any) => p.id === parseInt(id));
          if (proj) setCurrentProjectName(proj.name);
        }
      })
      .catch((err) => console.error('Error fetching projects:', err));
  }, [id]);

  const handleProjectChange = (projId: number) => {
    navigate(`/projects/${projId}/dashboard`);
  };

  const isActive = (path: string) => {
    return location.pathname.includes(path) ? 'bg-indigo-600/30 text-indigo-400 border-l-4 border-indigo-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200';
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen no-print">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
        <Compass className="h-8 w-8 text-indigo-500 animate-pulse" />
        <div>
          <h1 className="font-bold text-lg text-slate-50 tracking-wide">ProcureLens AI</h1>
          <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Analysis Engine</span>
        </div>
      </div>

      {/* Project Switcher */}
      <div className="p-4 border-b border-slate-800">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Current Project</label>
        {projects.length > 0 ? (
          <select 
            value={id || ''} 
            onChange={(e) => handleProjectChange(Number(e.target.value))}
            className="w-full bg-slate-850 border border-slate-750 text-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="" disabled>-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <div className="text-sm text-slate-400 italic">No projects created yet</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {id ? (
          <>
            <Link 
              to={`/projects/${id}/dashboard`}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(`/dashboard`)}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Project Dashboard</span>
            </Link>

            <Link 
              to={`/projects/${id}/assistant`}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(`/assistant`)}`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>AI Chat Assistant</span>
            </Link>
          </>
        ) : (
          <div className="px-4 py-3 text-xs text-slate-500 italic">
            Select or create a project to view dashboard options
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/60 my-4"></div>

        <Link 
          to="/projects/new"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 transition-all"
        >
          <PlusCircle className="h-5 w-5 text-indigo-400" />
          <span>New Analysis</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-955/20 hover:text-red-300 transition-all w-full text-left mt-1 cursor-pointer"
        >
          <LogOut className="h-5 w-5 text-red-450" />
          <span>Logout</span>
        </button>
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center space-x-1.5 font-medium">
            <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Connection Active</span>
          </span>
          <span className="bg-indigo-950/80 text-indigo-400 font-semibold px-2 py-0.5 rounded border border-indigo-900/60 text-[10px]">
            DEMO MODE
          </span>
        </div>
        <Link 
          to="/"
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 pt-1"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Landing Page</span>
        </Link>
      </div>
    </aside>
  );
}
