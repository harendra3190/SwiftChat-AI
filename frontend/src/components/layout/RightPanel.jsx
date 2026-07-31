import { useEffect, useState } from 'react';
import { Sparkles, Activity, Users, Send } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleChat } from '../../store/slices/chatSlice';
import api from '../../services/api';

export default function RightPanel() {
  const dispatch = useDispatch();
  const [trending, setTrending] = useState([]);
  const [connects, setConnects] = useState([]);
  const [panelLoaded, setPanelLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchPanelData = async () => {
      try {
        const [trendRes, connectsRes] = await Promise.all([
          api.get('/interactions/trending-emotions', { signal: controller.signal }),
          api.get('/users/connects', { signal: controller.signal })
        ]);
        setTrending(trendRes.data.data.trending);
        setConnects(connectsRes.data.data.users);
      } catch (err) {
        if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
        console.error('Failed to fetch right panel data', err);
      } finally {
        setPanelLoaded(true);
      }
    };
    fetchPanelData();
    
    return () => controller.abort();
  }, []);

  return (
    <aside className="bg-[#081329]/60 backdrop-blur-[30px] shadow-[0_0_40px_rgba(0,0,0,0.4)] h-full flex flex-col pt-6 pb-4 px-6 overflow-y-auto z-10 transition-all duration-300">
      
      {/* Trending Emotions */}
      <div className="mb-8">
        <h3 className="flex items-center gap-2 font-bold mb-4">
          <Sparkles className="text-sc-accent-light" size={18} />
          Trending Moods
        </h3>
        <div className="flex flex-col gap-4">
          {trending.length > 0 ? trending.map((t, idx) => (
            <div key={t.emotion}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-sc-text">{t.emotion}</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  t.trend === 'HOT' ? 'text-sc-pink' : t.trend === 'RISING' ? 'text-sc-cyan' : 'text-sc-muted'
                }`}>{t.trend}</span>
              </div>
              <div className="h-1 w-full bg-sc-hover rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${Math.max(20, 100 - (idx * 15))}%`,
                    background: t.trend === 'HOT' ? 'linear-gradient(135deg, #ec4899, #7c3aed)' : 
                               t.trend === 'RISING' ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : '#334155'
                  }}
                />
              </div>
            </div>
          )) : panelLoaded ? (
            <div className="text-center py-4">
              <p className="text-xs text-sc-muted italic tracking-wider">— Neural Silence —</p>
              <p className="text-[10px] text-sc-muted/60 mt-1">No active frequencies detected.</p>
            </div>
          ) : (
            <div className="text-sm text-sc-muted animate-pulse">Scanning...</div>
          )}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="mb-8">
        <h3 className="flex items-center gap-2 font-bold mb-4">
          <Activity className="text-sc-pink" size={18} />
          Your Feed Trends
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm pb-1">
              <span className="text-sc-text">#EuphoricRhythms</span>
              <span className="text-sc-pink text-[10px] uppercase font-bold">Hot</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex justify-between text-sm pb-1 w-[80%]">
              <span className="text-sc-text lg:truncate">#DeepFocusMode</span>
              <span className="text-sc-cyan text-[10px] uppercase font-bold">Growing</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex justify-between text-sm pb-1 w-[60%]">
              <span className="text-sc-text lg:truncate">#SolsticeVibe</span>
              <span className="text-sc-accent-light text-[10px] uppercase font-bold">Trending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connects */}
      <div className="mb-auto">
        <h3 className="flex items-center gap-2 font-bold mb-4">
          <Users className="text-sc-cyan" size={18} />
          Connects
        </h3>
        <div className="flex flex-col gap-4">
          {connects.length > 0 ? connects.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 w-4/5">
                <div className="w-8 h-8 rounded-full bg-sc-hover overflow-hidden relative flex-shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold">{user.username[0]}</div>
                  )}
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col truncate w-full">
                  <span className="text-sm font-semibold truncate">{user.displayName}</span>
                  <span className="text-[10px] text-sc-muted">Match: {Math.floor(Math.random() * 20 + 80)}%</span>
                </div>
              </div>
              <button className="text-sc-muted hover:text-sc-accent-light transition-colors p-1">
                <Users size={16} />
              </button>
            </div>
          )) : panelLoaded ? (
            <div className="text-center py-4">
              <p className="text-xs text-sc-muted italic tracking-wider">— Neural Silence —</p>
              <p className="text-[10px] text-sc-muted/60 mt-1">No connections in range.</p>
            </div>
          ) : (
            <div className="text-sm text-sc-muted animate-pulse">Scanning...</div>
          )}
        </div>
      </div>

      {/* Quick Chat Widget Trigger */}
      <div className="glass-card p-4 mt-6">
        <h4 className="flex items-center gap-2 text-sm font-bold text-sc-accent-light mb-2">
          <span className="bg-sc-hover p-1 rounded-md text-sc-accent-light"><Sparkles size={14}/></span>
          Quick Chat
        </h4>
        <p className="text-xs text-sc-muted mb-4 line-clamp-2">
          AI Assistant Ready. Ask me to summarize your feed or analyze today's vibe.
        </p>
        <button 
          onClick={() => dispatch(toggleChat())}
          className="w-full bg-sc-hover hover: rounded-xl px-3 py-2 text-xs flex justify-between items-center text-sc-muted transition-colors"
        >
          <span>Message AI...</span>
          <Send size={14} className="text-sc-accent-light" />
        </button>
      </div>
    </aside>
  );
}
