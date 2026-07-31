import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Send, Sparkles, User as UserIcon } from 'lucide-react';
import { toggleChat, sendMessage, addUserMessage } from '../../store/slices/chatSlice';

export default function ChatbotWidget() {
  const dispatch = useDispatch();
  const { messages, isTyping, isOpen, sessionId, aiSuggestion } = useSelector(state => state.chat);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const msg = input.trim();
    setInput('');
    dispatch(addUserMessage(msg));
    dispatch(sendMessage({ message: msg, sessionId }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-8 w-80 sm:w-96 h-[500px] glass-card flex flex-col shadow-2xl z-50 -light/30 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-sc-hover/50 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-accent flex items-center justify-center p-0.5 glow-pulse">
            <div className="h-full w-full bg-sc-bg rounded-full flex items-center justify-center">
              <Sparkles size={16} className="text-sc-accent-light" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm text-sc-text">ARIA</h3>
            <p className="text-[10px] text-sc-accent-light font-medium tracking-wider uppercase">Online System</p>
          </div>
        </div>
        <button onClick={() => dispatch(toggleChat())} className="text-sc-muted hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-sc-hover flex items-center justify-center flex-shrink-0 mt-auto">
                <Sparkles size={10} className="text-sc-accent-light" />
              </div>
            )}
            
            <div className={`text-sm ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-other'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-sc-hover flex items-center justify-center flex-shrink-0 mt-auto">
                <UserIcon size={10} className="text-sc-text" />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-2 justify-start">
             <div className="w-6 h-6 rounded-full bg-sc-hover flex items-center justify-center flex-shrink-0 mt-auto">
                <Sparkles size={10} className="text-sc-pink animate-pulse" />
              </div>
            <div className="chat-bubble-other py-2 px-4 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-sc-muted rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-sc-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-1.5 bg-sc-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* AI Suggestion Bubble */}
      {aiSuggestion && (
        <div className="px-4 py-2 animate-in fade-in slide-in-from-bottom-2">
          <div 
            onClick={() => { 
                setInput(''); 
                dispatch(addUserMessage(aiSuggestion)); 
                dispatch(sendMessage({ message: aiSuggestion, sessionId })); 
            }}
            className="group cursor-pointer bg-sc-accent/10 border border-sc-accent/20 hover:border-sc-accent/50 rounded-xl p-3 transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-sc-accent-light" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-sc-accent-light">Suggested Interaction</span>
            </div>
            <p className="text-xs text-sc-text group-hover:text-white transition-colors italic">"{aiSuggestion}"</p>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-sc-surface rounded-b-2xl flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ARIA anything..."
          className="flex-1 bg-sc-hover rounded-full px-4 py-2 outline-none text-sm focus: text-sc-text placeholder-sc-muted transition-colors"
          disabled={isTyping}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isTyping}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow-sm transition-all"
        >
          <Send size={16} className="-ml-1" />
        </button>
      </form>
    </div>
  );
}
