import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, MessageSquare, Share2, Sparkles, MoreHorizontal, Send, Flag, Trash2, X, CheckCircle } from 'lucide-react';
import { toggleLike } from '../../store/slices/feedSlice';
import { formatDistanceToNow } from '../../utils/formatters';
import api from '../../services/api';

// ── Mini Toast ──────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl text-white animate-fade-in"
      style={{ background: type === 'error' ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
    >
      <CheckCircle size={16} />
      {message}
    </div>
  );
}

// ── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ postId, onClose }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/interactions/report', { postId, reason, details });
      setToast({ message: 'Signal reported. Our neural team will review it.', type: 'success' });
      setTimeout(onClose, 2500);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to report', type: 'error' });
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center"
        style={{ background: 'rgba(6,14,32,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
          style={{ background: 'rgba(8,19,41,0.60)', backdropFilter: 'blur(30px)', border: '1px solid rgba(172,138,255,0.2)' }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-sc-muted hover:text-white transition"><X size={18} /></button>
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Flag size={16} className="text-sc-pink" /> Report Signal</h3>
          <p className="text-xs text-sc-muted mb-5">Help keep the neural stream healthy. Reports are anonymous.</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-sc-muted mb-2 block">Reason</label>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${reason === r ? 'bg-sc-accent text-white shadow-glow-sm' : 'bg-sc-hover text-sc-muted hover:text-sc-text'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs font-bold uppercase tracking-wider text-sc-muted mb-2 block">Details (optional)</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Describe the issue..."
                className="sc-input resize-none text-sm"
              />
            </div>
            <button type="submit" disabled={submitting} className="gradient-btn w-full py-2.5 text-sm">
              {submitting ? 'Transmitting...' : 'Send Report'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Main PostCard ─────────────────────────────────────────────────────────────
export default function PostCard({ post, onDelete }) {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector(state => state.auth);

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const menuRef = useRef(null);
  const commentInputRef = useRef(null);

  const isOwnPost = currentUser?.id === (post.user?.id || post.user?._id?.toString());

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    dispatch(toggleLike(post.id));
  };

  const handleCommentToggle = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await api.get(`/interactions/comments/${post.id || post._id}`);
        setComments(res.data.data.comments || []);
      } catch (_) {
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    }
    if (next) setTimeout(() => commentInputRef.current?.focus(), 150);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post('/interactions/comment', { postId: post.id || post._id, content: commentText.trim() });
      setComments(prev => [res.data.data.comment, ...prev]);
      setCommentText('');
    } catch (err) {
      setToast({ message: 'Failed to post comment', type: 'error' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id || post._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ message: '⚡ Signal link copied!', type: 'success' });
    } catch (_) {
      setToast({ message: 'Could not access clipboard', type: 'error' });
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this signal permanently?')) return;
    setDeletingPost(true);
    try {
      await api.delete(`/posts/${post.id || post._id}`);
      onDelete && onDelete(post.id || post._id);
    } catch (err) {
      setToast({ message: 'Failed to delete post', type: 'error' });
      setDeletingPost(false);
    }
  };

  const getMoodColor = (mood) => {
    switch (mood?.toLowerCase()) {
      case 'vibrant': return 'mood-vibrant text-sc-pink';
      case 'deep': return 'mood-deep text-purple-400';
      case 'ethereal': return 'mood-ethereal text-sc-cyan';
      default: return 'bg-sc-hover text-sc-muted';
    }
  };

  const getGlowColorBase = (mood) => {
    switch (mood?.toLowerCase()) {
      case 'vibrant': return 'bg-sc-pink shadow-[0_0_10px_rgba(236,72,153,0.5)]';
      case 'deep': return 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]';
      case 'ethereal': return 'bg-sc-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]';
      default: return 'bg-sc-accent shadow-[0_0_10px_rgba(172,138,255,0.5)]';
    }
  };

  if (deletingPost) return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {showReportModal && <ReportModal postId={post.id || post._id} onClose={() => setShowReportModal(false)} />}

      <div className="post-card group flex gap-4">
        {/* Inset Glow Bar */}
        <div className={`w-[2px] rounded-full shrink-0 ${getGlowColorBase(post.emotion)}`}></div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sc-hover overflow-hidden">
                {post.user?.avatarUrl ? (
                  <img src={post.user.avatarUrl} alt={post.user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-lg">
                    {post.user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sc-text hover:underline cursor-pointer">{post.user?.displayName}</span>
                  {post.emotion && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getMoodColor(post.emotion)}`}>
                      {post.emotion}
                    </span>
                  )}
                </div>
                <div className="flex flex-col text-xs text-sc-muted">
                  <span>@{post.user?.username} • {formatDistanceToNow(new Date(post.createdAt))}</span>
                </div>
              </div>
            </div>

            {/* Post Menu (Three Dots) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="text-sc-muted hover:text-white p-2 rounded-lg hover:bg-sc-hover transition-colors"
                id={`post-menu-${post.id || post._id}`}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-2xl z-50"
                  style={{ background: 'rgba(8,19,41,0.90)', backdropFilter: 'blur(30px)', border: '1px solid rgba(172,138,255,0.15)' }}
                >
                  {isOwnPost ? (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={15} /> Delete Signal
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setShowReportModal(true); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-sc-muted hover:bg-sc-hover hover:text-sc-text transition-colors"
                    >
                      <Flag size={15} /> Report Feedback
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-4">
            {post.caption && <p className="text-sm text-sc-text mb-3 leading-relaxed">{post.caption}</p>}
            {post.mediaUrl && (
              <div className="w-full rounded-xl overflow-hidden bg-sc-hover mb-3 max-h-[500px]">
                {post.mediaType === 'video' ? (
                  <video src={post.mediaUrl} controls className="w-full object-contain max-h-[500px]" />
                ) : (
                  <img src={post.mediaUrl} alt="Post media" className="w-full object-cover max-h-[500px] hover:scale-105 transition-transform duration-500" />
                )}
              </div>
            )}
          </div>

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-sc-pink' : 'text-sc-muted hover:text-sc-pink'}`}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'animate-pulse' : ''} />
                <span>{likeCount >= 1000 ? (likeCount / 1000).toFixed(1) + 'k' : likeCount}</span>
              </button>

              <button
                onClick={handleCommentToggle}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${showComments ? 'text-sc-accent-light' : 'text-sc-muted hover:text-sc-accent-light'}`}
              >
                <MessageSquare size={18} />
                <span>{comments.length > 0 ? comments.length : (post._count?.comments || 0)}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm font-medium text-sc-muted hover:text-sc-cyan transition-colors"
                title="Copy link"
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* AI Generator Badge */}
            {(post.caption?.includes('✨') || post.emotion) ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-sc-hover rounded-full text-xs text-sc-muted">
                <Sparkles size={12} className="text-sc-accent" />
                AI Assisted
              </div>
            ) : null}
          </div>

          {/* Comment Section — Glassmorphic Expand */}
          {showComments && (
            <div
              className="mt-4 rounded-xl p-4 animate-fade-in"
              style={{ background: 'rgba(8,19,41,0.50)', backdropFilter: 'blur(12px)', border: '1px solid rgba(172,138,255,0.08)' }}
            >
              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mb-4">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Transmit a thought..."
                  maxLength={500}
                  className="sc-input text-sm py-2 flex-1"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="p-2 rounded-xl bg-sc-accent/20 text-sc-accent-light hover:bg-sc-accent/40 transition-colors disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </form>

              {/* Comments List */}
              {loadingComments ? (
                <div className="text-xs text-sc-muted animate-pulse text-center py-2">Loading thoughts...</div>
              ) : comments.length > 0 ? (
                <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                  {comments.map(c => (
                    <div key={c.id || c._id} className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-sc-hover flex-shrink-0 overflow-hidden">
                        {c.user?.avatarUrl ? (
                          <img src={c.user.avatarUrl} alt={c.user.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold">{c.user?.username?.[0]?.toUpperCase()}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-sc-text">{c.user?.displayName || c.user?.username}</span>
                          <span className="text-[10px] text-sc-muted">{formatDistanceToNow(new Date(c.createdAt))}</span>
                        </div>
                        <p className="text-xs text-sc-text/80 mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-sc-muted text-center py-2 italic">— Neural Silence — Be the first to resonate.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
