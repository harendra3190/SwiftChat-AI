import { NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Home, Compass, PlusSquare, MessageSquare, User, Zap, LogOut } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const { activeEmotion } = useSelector(state => state.ui);
  const [initialized, setInitialized] = useState(false);

  // After mount, mark as initialized so we can show Neural Silence instead of Loading...
  useEffect(() => {
    const timer = setTimeout(() => setInitialized(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const getEmotionColor = (vibe) => {
    switch(vibe) {
      case 'Electric': return 'text-pink-400';
      case 'Resonant': return 'text-purple-400';
      case 'Indigo': return 'text-blue-400';
      case 'Vivid': return 'text-orange-400';
      case 'Crystal': return 'text-cyan-400';
      default: return 'text-sc-accent-light';
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Create', path: '/create', icon: PlusSquare },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Profile', path: `/profile/${user?.id}`, icon: User },
  ];

  const currentVibe = activeEmotion?.vibe || user?.emotionVibe;
  const vibeLabel = currentVibe
    ? `Vibe: ${currentVibe}`
    : initialized
      ? '— Neural Silence —'
      : 'Vibe: ...';

  return (
    <aside className="bg-[#081329]/60 backdrop-blur-[30px] shadow-[0_0_40px_rgba(0,0,0,0.4)] h-full flex flex-col py-6 z-10 transition-all duration-300">
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-accent">
          SwiftChat
        </h1>
      </div>

      <div className="px-6 mb-8">
        <p className="text-xs text-sc-muted font-bold tracking-wider uppercase mb-2">Emotion Pulse</p>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${(getEmotionColor(currentVibe) || 'text-sc-accent-light').replace('text-', 'bg-')}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${(getEmotionColor(currentVibe) || 'text-sc-accent-light').replace('text-', 'bg-')}`}></span>
          </span>
          <span className={currentVibe ? getEmotionColor(currentVibe) : initialized ? 'text-sc-muted italic text-xs' : 'text-sc-muted'}>
            {vibeLabel}
          </span>
        </div>
      </div>


      <nav className="flex-1 px-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active shadow-glow-sm' : ''}`}
            >
              <item.icon size={20} className={isActive ? 'text-sc-accent-light' : 'text-sc-muted'} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}

        <div className="mt-8">
          <NavLink to="/ai-insights" className="w-full mt-2 gradient-btn py-3 px-4 flex items-center justify-center gap-2">
            <Zap size={18} />
            AI Insights
          </NavLink>
        </div>
      </nav>

      <div className="px-4 mt-auto">
        <button 
          onClick={() => dispatch(logout())}
          className="w-full sidebar-item mt-2 !text-sc-muted hover:!text-red-400 hover:!bg-red-400/10"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
