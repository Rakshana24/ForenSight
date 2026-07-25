import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Divider, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
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
    if (currentConversation && currentConversation.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages]);

  // Reset scroll to top when opening an empty conversation
  useEffect(() => {
    if (currentConversation && currentConversation.messages.length === 0) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    }
  }, [currentConversation?.conversationId]);

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
              flexWrap: 'wrap',
              gap: 2.5,
              background: isDark 
                ? 'linear-gradient(90deg, #181824 0%, #1c1c2b 100%)' 
                : 'linear-gradient(90deg, #F3E8FF 0%, #FFFFFF 100%)',
              borderBottom: '1px solid',
              borderColor: 'divider',
              transition: 'background-color 0.3s ease, border-color 0.3s ease'
            }}
          >
            {/* Title & Metadata block */}
            <Box>
              <Typography variant="h6" color="text.primary" sx={{ lineHeight: 1.2, fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.3px' }}>
                {currentConversation.title.replace(/siri/gi, 'New')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.78rem' }}>
                Investigation insights powered by AI
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontWeight: 700 }}>ID:</span> {currentConversation.conversationId}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', userSelect: 'none' }}>
                  •
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  📅 {formatDateOnly(currentConversation.createdTime)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', userSelect: 'none' }}>
                  •
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  🕒 {formatTimeOnly(currentConversation.createdTime)}
                </Typography>
              </Box>
            </Box>

            {/* Premium Action Toolbars */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              {/* Unified AI Analysis Toolbar */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: isDark ? 'rgba(24, 24, 37, 0.6)' : '#FAFAFA',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                  flexWrap: 'wrap'
                }}
              >
                {[
                  {
                    label: 'Case Summary',
                    icon: <DescriptionIcon sx={{ fontSize: '1.05rem' }} />,
                    action: 'Generate AI Case Summary',
                    bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE',
                    color: isDark ? '#38BDF8' : '#0369A1'
                  },
                  {
                    label: 'Assessment',
                    icon: <AssessmentIcon sx={{ fontSize: '1.05rem' }} />,
                    action: 'Generate AI Investigation Assessment',
                    bg: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EEF2FF',
                    color: isDark ? '#60A5FA' : '#3730A3'
                  },
                  {
                    label: 'Timeline',
                    icon: <AccessTimeIcon sx={{ fontSize: '1.05rem' }} />,
                    action: 'Generate Investigation Timeline',
                    bg: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ECFDF5',
                    color: isDark ? '#34D399' : '#047857'
                  },
                  {
                    label: 'Similar Cases',
                    icon: <FolderSharedIcon sx={{ fontSize: '1.05rem' }} />,
                    action: 'Find Similar Cases',
                    bg: isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED',
                    color: isDark ? '#FDBA74' : '#C2410C'
                  },
                  {
                    label: 'Recommend Leads',
                    icon: <AutoAwesomeIcon sx={{ fontSize: '1.05rem' }} />,
                    action: 'Recommend Investigation Leads',
                    bg: isDark ? 'rgba(6, 182, 212, 0.12)' : '#ECFEFF',
                    color: isDark ? '#22D3EE' : '#0E7490'
                  }
                ].map((btn, idx) => (
                  <Box
                    key={idx}
                    onClick={() => !loading && sendChatMessage(btn.action)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: { xs: 80, sm: 90, md: 100 },
                      height: 68,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                      borderRight: idx === 4 ? 'none' : '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        '& .tool-icon-box': {
                          transform: loading ? 'none' : 'scale(1.1)',
                        }
                      }
                    }}
                  >
                    <Box
                      className="tool-icon-box"
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: btn.bg,
                        color: btn.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 0.6,
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      {btn.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        px: 0.5,
                        lineHeight: 1.1,
                        color: 'text.primary',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {btn.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Cohesive Utility Toolbar (PDF Export & Delete) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 68,
                  bgcolor: isDark ? 'rgba(24, 24, 37, 0.6)' : '#FAFAFA',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                {/* Export PDF Button */}
                <Tooltip title="Export PDF" arrow placement="bottom">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={exportCurrentPDF}
                      disabled={loading}
                      sx={{
                        width: 48,
                        height: 68,
                        borderRadius: 0,
                        color: isDark ? '#38BDF8' : '#0369A1',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.04)',
                        }
                      }}
                    >
                      {loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                    </IconButton>
                  </span>
                </Tooltip>

                {/* Delete Button */}
                <Tooltip title="Delete Investigation" arrow placement="bottom">
                  <span>
                    <IconButton
                      color="error"
                      onClick={handleDelete}
                      disabled={loading}
                      sx={{
                        width: 48,
                        height: 68,
                        borderRadius: 0,
                        color: 'error.main',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* 2. Messages Pane */}
          <Box ref={messagesContainerRef} sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', transition: 'background-color 0.3s ease' }}>
            {currentConversation.messages.length === 0 ? (
              <Box sx={{ m: 'auto', maxWidth: 650, width: '100%', display: 'flex', flexDirection: 'column', gap: 3.5, py: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 850, mb: 1, color: 'text.primary', fontSize: '1.4rem', letterSpacing: '-0.3px' }}>
                    Start Your Investigation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    Select a suggested analysis or type a custom query below to query the crime records database.
                  </Typography>
                </Box>

                {/* Getting Started Onboarding Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid', borderColor: 'divider', pb: 3.5, mb: 1 }}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, color: 'text.primary', fontSize: '1.1rem', letterSpacing: '-0.2px' }}>
                      Start by Selecting an Investigation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                      Ask the AI about a Case, FIR, Crime, Accused, Victim, Police Station, or Location before generating AI reports.
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '0.7rem' }}>
                      Example Questions
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {[
                        { label: 'Show details of Case ID 100', text: 'Details about case id 100' },
                        { label: 'Show details of accused Somashekar Rao', text: 'Show details of accused named Somashekar Rao' },
                        { label: 'Show details of accused Arjun Reddy', text: 'Show details of accused named Arjun Reddy' }
                      ].map((q, qIdx) => (
                        <Box
                          key={qIdx}
                          onClick={() => sendChatMessage(q.text)}
                          sx={{
                            p: 2,
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.04)' : 'rgba(2, 132, 199, 0.02)',
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.8rem' }}>
                            {q.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
                {/* Instructional Info Card */}
                <Box
                  sx={{
                    p: 3,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.03)' : 'rgba(2, 132, 199, 0.02)',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    textAlign: 'left',
                    transition: 'background-color 0.3s ease, border-color 0.3s ease',
                    mt: 1
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: 'primary.main',
                      mb: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '0.95rem'
                    }}
                  >
                    🚀 Next Step
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 2, fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    Once the investigation details are loaded into the conversation, you can use the AI Investigation tools available in the top-right corner of this page.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.825rem', lineHeight: 1.5 }}>
                    These tools analyze the currently loaded investigation and generate advanced insights such as:
                  </Typography>
                  <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                    {[
                      'Case Summary',
                      'Investigation Timeline',
                      'Case Quality Assessment',
                      'Similar Case Analysis',
                      'Investigation Lead Recommendations'
                    ].map((item, idx) => (
                      <Typography key={idx} variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem' }}>
                        • {item}
                      </Typography>
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                    These reports work only after an investigation has been loaded into the conversation.
                  </Typography>
                </Box>
              </Box>
            ) : (
              currentConversation.messages.map((msg, index) => {
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
              })
            )}

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
