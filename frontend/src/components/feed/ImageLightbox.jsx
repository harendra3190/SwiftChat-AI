import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ImageLightbox({ imageUrl, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling behind lightbox
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-12 animate-fade-in"
      style={{ background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/15 text-white transition-all shadow-glow-sm cursor-pointer z-50 transform hover:scale-110"
      >
        <X size={20} />
      </button>
      <img 
        src={imageUrl} 
        alt="Fullscreen media" 
        className="max-w-full max-h-full object-contain cursor-default shadow-2xl rounded-sm"
        style={{ filter: 'drop-shadow(0 0 40px rgba(172,138,255,0.15))' }}
      />
    </div>
  );
}
