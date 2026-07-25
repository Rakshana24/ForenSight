import React from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography } from '@mui/material';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { AppThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ChatHeader from './components/Layout/ChatHeader';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/Chat';
import Intelligence from './pages/Intelligence';
import Analytics from './pages/Analytics';
import ErrorAlert from './components/Common/ErrorAlert';
import AIBubble from './components/Assistant/AIBubble';

const MUIThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { themeMode } = useAppTheme();

  const currentTheme = React.useMemo(() => {
    return createTheme({
      palette: {
        mode: themeMode,
        background: {
          default: themeMode === 'dark' ? '#0F0F13' : '#F5F6FA',
          paper: themeMode === 'dark' ? '#181824' : '#FFFFFF',
        },
        primary: {
          main: themeMode === 'dark' ? '#38BDF8' : '#1E3A8A',
          dark: themeMode === 'dark' ? '#0284C7' : '#172554',
          light: themeMode === 'dark' ? '#7DD3FC' : '#DBEAFE',
        },
        text: {
          primary: themeMode === 'dark' ? '#F3F4F6' : '#1F2937',
          secondary: themeMode === 'dark' ? '#9CA3AF' : '#4B5563',
          disabled: themeMode === 'dark' ? '#6B7280' : '#9CA3AF',
        },
        divider: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB',
      },
      typography: {
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
        h4: {
          fontSize: '2rem',
          fontWeight: 700,
          color: themeMode === 'dark' ? '#F3F4F6' : '#1F2937',
        },
        body1: {
          fontSize: '0.95rem',
          lineHeight: 1.5,
        },
        body2: {
          fontSize: '0.875rem',
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
              border: themeMode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E5E7EB',
            },
          },
        },
      },
    });
  }, [themeMode]);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box
        sx={{
          bgcolor: 'background.default',
          color: 'text.primary',
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s ease, color 0.3s ease',
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
};

const ChatRouteWrapper: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { currentConversation, selectConversation, conversations, loading } = useChat();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (conversationId) {
      // Validate that the conversation exists in the loaded list
      const exists = conversations.some(c => c.conversationId === conversationId);
      if (!loading && !exists) {
        navigate('/', { replace: true });
        return;
      }

      if (!currentConversation || currentConversation.conversationId !== conversationId) {
        selectConversation(conversationId);
      }
    }
  }, [conversationId, currentConversation, selectConversation, conversations, loading, navigate]);

  return <ChatPage />;
};

const tickerBulletins = [
  'New investigation assessment generated for FIR No. 412/2026',
  'Potential co-offender relationship identified in suspect network',
  'Seasonal spike in property offences flagged for Central District',
  'Forensic anomaly score calculated for investigation file #8821',
  'Intelligence relationship graph synchronized with active case files',
  'High-risk crime hotspot warning and alert issued for Sector 4',
  'New demographic distribution summary updated for active investigation'
];

const MainLayout: React.FC = () => {
  const { themeMode } = useAppTheme();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        width: '100vw', 
        overflow: 'hidden', 
        bgcolor: 'background.default',
        transition: 'background-color 0.3s ease',
      }}
    >
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.3); opacity: 1; }
          }
          .marquee-container {
            display: flex;
            gap: 60px;
            animation: marquee 35s linear infinite;
          }
          .marquee-container:hover {
            animation-play-state: paused;
          }
        `}
      </style>

      {/* 64px Top App Bar */}
      <ChatHeader />

      {/* Global Horizontal Scrolling Intelligence Ticker */}
      <Box
        sx={{
          width: '100%',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 0.8,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          zIndex: 5,
          transition: 'background-color 0.3s ease, border-color 0.3s ease'
        }}
      >
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: '#FFFFFF',
            px: 1.5,
            py: 0.25,
            borderRadius: '4px',
            fontSize: '0.68rem',
            fontWeight: 'bold',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            zIndex: 2,
            boxShadow: themeMode === 'dark' ? '0 2px 6px rgba(56, 189, 248, 0.25)' : '0 2px 6px rgba(2, 132, 199, 0.25)'
          }}
        >
          Bulletins
        </Box>
        <Box sx={{ overflow: 'hidden', display: 'flex', flex: 1, position: 'relative', alignItems: 'center' }}>
          <Box className="marquee-container">
            {tickerBulletins.map((bulletin, idx) => (
              <Box key={`c1-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, whiteSpace: 'nowrap' }}>
                <Box 
                  sx={{ 
                    width: 6, 
                    height: 6, 
                    bgcolor: '#10B981', 
                    borderRadius: '50%', 
                    boxShadow: '0 0 6px #10B981',
                    animation: 'pulse-dot 1.8s infinite'
                  }} 
                />
                <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.8rem', fontWeight: 600 }}>
                  {bulletin}
                </Typography>
                <Typography variant="body2" sx={{ color: 'primary.main', mx: 2, fontWeight: 'bold' }}>
                  |
                </Typography>
              </Box>
            ))}
            {tickerBulletins.map((bulletin, idx) => (
              <Box key={`c2-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, whiteSpace: 'nowrap' }}>
                <Box 
                  sx={{ 
                    width: 6, 
                    height: 6, 
                    bgcolor: '#10B981', 
                    borderRadius: '50%', 
                    boxShadow: '0 0 6px #10B981',
                    animation: 'pulse-dot 1.8s infinite'
                  }} 
                />
                <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.8rem', fontWeight: 600 }}>
                  {bulletin}
                </Typography>
                <Typography variant="body2" sx={{ color: 'primary.main', mx: 2, fontWeight: 'bold' }}>
                  |
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

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
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </Box>
        </Box>
      </Box>

      {/* Global alert handler */}
      <ErrorAlert />

      {/* Siri AI Float Assistant Bubble */}
      <AIBubble />
    </Box>
  );
};

const App: React.FC = () => {
  return (
    <AppThemeProvider>
      <MUIThemeWrapper>
        <Router>
          <AuthProvider>
            <ChatProvider>
              <MainLayout />
            </ChatProvider>
          </AuthProvider>
        </Router>
      </MUIThemeWrapper>
    </AppThemeProvider>
  );
};

export default App;
