import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Chatbot from './pages/Chatbot';

const RootRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        color: "#6D4FC2"
      }}>
        Loading...
      </div>
    );
  }

  return user ? <Chatbot key={user.id} /> : <Login />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
