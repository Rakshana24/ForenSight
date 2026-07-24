import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Divider, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import { useChat } from '../../contexts/ChatContext';
import ChatBubble from '../../components/Chat/ChatBubble';
import ChatInput from '../../components/Chat/ChatInput';

const Chat: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const {
    currentConversation,
    createNewConversation,
    sendChatMessage,
    deleteSelectedConversation,
    exportCurrentPDF,
    resetCurrentConversation,
    loading
  } = useChat();

  const [_recordedAudioBlob, setRecordedAudioBlob] = React.useState<Blob | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({});

  // Revoke temporary audio URLs when active conversation changes
  useEffect(() => {
    const cache = audioCacheRef.current;
    Object.values(cache).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to revoke audio object URL:', e);
      }
    });
    audioCacheRef.current = {};
  }, [currentConversation?.conversationId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const formatDateOnly = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatTimeOnly = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
    } catch {
      return 'N/A';
    }
  };

  const handleDelete = async () => {
    if (!currentConversation) return;
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteSelectedConversation(currentConversation.conversationId);
      resetCurrentConversation();
      navigate('/');
    }
  };



  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'background-color 0.3s ease, border-color 0.3s ease'
      }}
    >
      {currentConversation ? (
        /* ================== ACTIVE CHAT WORKSPACE ================== */
        <>
          {/* 1. Chat Header Bar */}
          <Box
            sx={{
              p: 2.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: isDark 
                ? 'linear-gradient(90deg, #181824 0%, #1c1c2b 100%)' 
                : 'linear-gradient(90deg, #F3E8FF 0%, #FFFFFF 100%)',
              borderBottom: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 0.3s ease, border-color 0.3s ease'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* 3D-ish document stack illustration */}
              <Box sx={{ display: { xs: 'none', sm: 'block' }, position: 'relative', width: 64, height: 64, mr: 2.5 }}>
                <Box sx={{
                  width: 44,
                  height: 52,
                  bgcolor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#ECE9FC',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: '6px',
                  position: 'relative',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  <Box sx={{ width: '60%', height: 2.5, bgcolor: 'primary.light', mt: 1.5, ml: 0.8, borderRadius: 1 }} />
                  <Box sx={{ width: '75%', height: 2.5, bgcolor: 'primary.light', mt: 0.8, ml: 0.8, borderRadius: 1 }} />
                  <Box sx={{ width: '50%', height: 2.5, bgcolor: 'primary.light', mt: 0.8, ml: 0.8, borderRadius: 1 }} />
                </Box>
                <Box sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                  <SearchIcon sx={{ fontSize: '0.875rem', color: 'primary.main' }} />
                </Box>
              </Box>

              {/* Title & Metadata */}
              <Box>
                <Typography variant="h6" color="text.primary" sx={{ lineHeight: 1.2, fontWeight: 800, fontSize: '1.2rem' }}>
                  {currentConversation.title.replace(/siri/gi, 'New')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1, fontSize: '0.78rem' }}>
                  Investigation insights powered by AI
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {/* ID Capsule */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 22,
                    px: 1.2,
                    borderRadius: '11px',
                    bgcolor: isDark ? 'rgba(124, 58, 237, 0.18)' : '#ECE9FC',
                    color: isDark ? '#C084FC' : '#7C3AED',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    ID {currentConversation.conversationId}
                  </Box>
                  {/* Date Capsule */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 22,
                    px: 1.2,
                    borderRadius: '11px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F3F9',
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    gap: 0.5
                  }}>
                    📅 {formatDateOnly(currentConversation.createdTime)}
                  </Box>
                  {/* Time Capsule */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 22,
                    px: 1.2,
                    borderRadius: '11px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F3F9',
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    gap: 0.5
                  }}>
                    🕒 {formatTimeOnly(currentConversation.createdTime)}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Case Summary Card */}
                <Box
                  onClick={() => !loading && sendChatMessage('Generate AI Case Summary')}
                  sx={{
                    width: 82,
                    height: 82,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: loading ? 'none' : 'scale(1.04)',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 12px rgba(124,58,237,0.1)',
                    }
                  }}
                >
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isDark ? 'rgba(124, 58, 237, 0.18)' : '#ECE9FC',
                    color: isDark ? '#A78BFA' : '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.8
                  }}>
                    <DescriptionIcon sx={{ fontSize: '1.15rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 'bold', textAlign: 'center', px: 0.5, lineHeight: 1.1, color: 'text.primary' }}>
                    Case Summary
                  </Typography>
                </Box>

                {/* Assessment Card */}
                <Box
                  onClick={() => !loading && sendChatMessage('Generate AI Investigation Assessment')}
                  sx={{
                    width: 82,
                    height: 82,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: loading ? 'none' : 'scale(1.04)',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 12px rgba(124,58,237,0.1)',
                    }
                  }}
                >
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#E5F0FF',
                    color: isDark ? '#60A5FA' : '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.8
                  }}>
                    <AssessmentIcon sx={{ fontSize: '1.15rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 'bold', textAlign: 'center', px: 0.5, lineHeight: 1.1, color: 'text.primary' }}>
                    Assessment
                  </Typography>
                </Box>

                {/* Timeline Card */}
                <Box
                  onClick={() => !loading && sendChatMessage('Generate Investigation Timeline')}
                  sx={{
                    width: 82,
                    height: 82,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: loading ? 'none' : 'scale(1.04)',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 12px rgba(124,58,237,0.1)',
                    }
                  }}
                >
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#E6F4EA',
                    color: isDark ? '#34D399' : '#137333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.8
                  }}>
                    <AccessTimeIcon sx={{ fontSize: '1.15rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 'bold', textAlign: 'center', px: 0.5, lineHeight: 1.1, color: 'text.primary' }}>
                    Timeline
                  </Typography>
                </Box>

                {/* Similar Cases Card */}
                <Box
                  onClick={() => !loading && sendChatMessage('Find Similar Cases')}
                  sx={{
                    width: 82,
                    height: 82,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: loading ? 'none' : 'scale(1.04)',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 12px rgba(124,58,237,0.1)',
                    }
                  }}
                >
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFEFE2',
                    color: isDark ? '#FDBA74' : '#E65100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.8
                  }}>
                    <FolderSharedIcon sx={{ fontSize: '1.15rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 'bold', textAlign: 'center', px: 0.5, lineHeight: 1.1, color: 'text.primary' }}>
                    Similar Cases
                  </Typography>
                </Box>

                {/* Recommend Leads Card */}
                <Box
                  onClick={() => !loading && sendChatMessage('Recommend Investigation Leads')}
                  sx={{
                    width: 82,
                    height: 82,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.6 : 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: loading ? 'none' : 'scale(1.04)',
                      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 12px rgba(124,58,237,0.1)',
                    }
                  }}
                >
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isDark ? 'rgba(6, 182, 212, 0.15)' : '#E4F7FB',
                    color: isDark ? '#67E8F9' : '#00838F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.8
                  }}>
                    <AutoAwesomeIcon sx={{ fontSize: '1.15rem' }} />
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 'bold', textAlign: 'center', px: 0.5, lineHeight: 1.1, color: 'text.primary' }}>
                    Recommend Leads
                  </Typography>
                </Box>
              </Box>

              {/* Divider */}
              <Box sx={{ borderRight: '1px solid', borderColor: 'divider', height: 72, mx: 2 }} />

              {/* Utility Vertical Stack (Export / Delete) */}
              <Box
                sx={{
                  width: 44,
                  height: 82,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: '4px',
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '12px'
                }}
              >
                <Tooltip title="Export PDF" arrow placement="left">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={exportCurrentPDF}
                      disabled={loading}
                      size="small"
                      sx={{
                        p: 0.5,
                        color: isDark ? '#A78BFA' : '#7C3AED',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.06)',
                        }
                      }}
                    >
                      {loading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>

                <Box sx={{ width: '70%', height: '1px', bgcolor: 'divider' }} />

                <Tooltip title="Delete Investigation" arrow placement="left">
                  <span>
                    <IconButton
                      color="error"
                      onClick={handleDelete}
                      disabled={loading}
                      size="small"
                      sx={{
                        p: 0.5,
                        color: 'error.main',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)',
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* 2. Messages Pane */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', transition: 'background-color 0.3s ease' }}>
            {currentConversation.messages.map((msg, index) => {
              const prevMsg = index > 0 ? currentConversation.messages[index - 1] : null;
              const originalPrompt = prevMsg && prevMsg.role === 'User' ? prevMsg.message : '';
              return (
                <ChatBubble
                  key={msg.messageId}
                  msg={msg}
                  originalPrompt={originalPrompt}
                  audioCacheRef={audioCacheRef}
                />
              );
            })}

            {/* Assistant typing indicator */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'background-color 0.3s ease, border-color 0.3s ease'
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Analyzing intelligence files...
                  </Typography>
                </Box>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* 3. Input Message Field */}
          <ChatInput 
            onSend={sendChatMessage} 
            disabled={loading} 
            onVoiceRecordingComplete={setRecordedAudioBlob}
          />
        </>
      ) : (
        /* ================== NEW CHAT / WELCOME SCREEN ================== */
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflowY: 'auto', transition: 'background-color 0.3s ease' }}>
          <Box sx={{ m: 'auto', maxWidth: 800, width: '100%', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* Center Logo */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <LocalPoliceIcon color="primary" sx={{ fontSize: 56 }} />
              <Typography variant="h4" color="text.primary" sx={{ textAlign: 'center', mt: 1, fontWeight: 'bold' }}>
                ForenSight Crime Intelligence
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 450, mt: 0.5 }}>
                Query case records, trace suspected accomplices, look up officer patrols, and download PDF summaries securely.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => createNewConversation('New Investigation')}
                sx={{
                  mt: 3,
                  py: 1.2,
                  px: 3,
                  fontWeight: 'bold',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'none',
                    bgcolor: 'primary.dark'
                  }
                }}
              >
                Start New Investigation
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Chat;
