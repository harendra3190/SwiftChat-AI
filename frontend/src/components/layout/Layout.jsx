import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import ChatbotWidget from '../ai/ChatbotWidget';

export default function Layout() {
  const { isSidebarOpen, isRightPanelOpen } = useSelector((state) => state.ui);

  return (
    <div className="app-layout">
      {/* LEFT COLUMN — sticky sidebar */}
      <div className="sidebar-col bg-[#081329]/60 backdrop-blur-[30px] shadow-[2px_0_20px_rgba(0,0,0,0.3)]">
        <Sidebar />
      </div>

      {/* CENTER COLUMN — only scrollable area */}
      <main className="main-col bg-sc-bg">
        <Outlet />
      </main>

      {/* RIGHT COLUMN — sticky right panel */}
      <div className="right-panel-col bg-[#081329]/60 backdrop-blur-[30px] shadow-[-2px_0_20px_rgba(0,0,0,0.3)]">
        <RightPanel />
      </div>

      <ChatbotWidget />
    </div>
  );
}
