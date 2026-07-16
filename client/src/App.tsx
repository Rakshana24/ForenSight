import React from 'react';
import { HashRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { ChatProvider, useChat } from './contexts/ChatContext';
import ChatHeader from './components/Layout/ChatHeader';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/Chat';
import ErrorAlert from './components/Common/ErrorAlert';

// Create simple professional government dashboard theme
const theme = createTheme({
  palette: {
    background: {
      default: '#F5F6FA',
      paper: '#FFFFFF',
    },
    primary: {
      main: '#1E3A8A', // Dark Blue
      dark: '#172554',
      light: '#3B82F6',
    },
    text: {
      primary: '#1F2937', // Dark Grey
      secondary: '#4B5563', // Muted Grey
      disabled: '#9CA3AF',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: {
      fontSize: '2rem', // ~32px
      fontWeight: 700,
      color: '#1F2937',
    },
    body1: {
      fontSize: '0.95rem', // ~15px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // ~14px
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: 'none',
          border: '1px solid #E5E7EB',
        },
      },
    },
  },
});

const ChatRouteWrapper: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { currentConversation, selectConversation } = useChat();

  React.useEffect(() => {
    if (conversationId && (!currentConversation || currentConversation.conversationId !== conversationId)) {
      selectConversation(conversationId);
    }
  }, [conversationId, currentConversation, selectConversation]);

  return <ChatPage />;
};

const MainLayout: React.FC = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        width: '100vw', 
        overflow: 'hidden', 
        bgcolor: '#F5F6FA' 
      }}
    >
      {/* 64px Top App Bar */}
      <ChatHeader />

      {/* Main Workspace below App Bar */}
      <Box sx={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>
        {/* Fixed Left Sidebar (300px) */}
        <Sidebar />

        {/* Dynamic Centered content pane with max-width limits (1400px) */}
        <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center', height: '100%', overflow: 'hidden' }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: '1400px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            <Routes>
              {/* Opens directly to Chat as the Home page */}
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat/:conversationId" element={<ChatRouteWrapper />} />
              {/* Dashboard is moved to a separate route */}
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </Box>
        </Box>
      </Box>

      {/* Global alert handler */}
      <ErrorAlert />
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <ChatProvider>
          <MainLayout />
        </ChatProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
