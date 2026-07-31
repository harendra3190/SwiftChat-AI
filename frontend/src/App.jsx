import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { fetchProfile } from './store/slices/authSlice';
import { connectSocket, disconnectSocket } from './services/socket';

// Layout
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/layout/ErrorBoundary';
// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import HomeFeed from './pages/HomeFeed';
import Explore from './pages/Explore';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import AIInsights from './pages/AIInsights';

const PrivateRoute = ({ children }) => {
  const { accessToken } = useSelector((state) => state.auth);
  return accessToken ? children : <Navigate to="/login" />;
};

function App() {
  const dispatch = useDispatch();
  const { accessToken, status } = useSelector((state) => state.auth);

  useEffect(() => {
    if (accessToken) {
      if (status === 'idle') {
        dispatch(fetchProfile());
      }
      // Establish the WebSocket bridge
      connectSocket();
    } else {
      // Sever the link if unauthenticated
      disconnectSocket();
    }
  }, [accessToken, dispatch, status]);

  return (
    <>
      <Toaster position="top-right" />
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/ai-insights" element={<AIInsights />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;
