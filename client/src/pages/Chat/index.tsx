import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Divider, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useChat } from '../../contexts/ChatContext';
import ChatBubble from '../../components/Chat/ChatBubble';
import ChatInput from '../../components/Chat/ChatInput';

const Chat: React.FC = () => {
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
        bgcolor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden'
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
              bgcolor: '#FFFFFF',
              borderBottom: '1px solid #E5E7EB'
            }}
          >
            <Box>
              <Typography variant="h6" color="text.primary" sx={{ lineHeight: 1.2, fontWeight: 'bold' }}>
                {currentConversation.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  ID: <span style={{ fontFamily: 'monospace' }}>{currentConversation.conversationId}</span>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Date: {formatTime(currentConversation.createdTime)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                onClick={() => sendChatMessage('Generate AI Case Summary')}
                disabled={loading}
                sx={{
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'none',
                    bgcolor: 'primary.dark'
                  }
                }}
              >
                Generate AI Case Summary
              </Button>

              <Button
                variant="contained"
                size="small"
                color="secondary"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                onClick={() => sendChatMessage('Generate AI Investigation Assessment')}
                disabled={loading}
                sx={{
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'none',
                    bgcolor: 'secondary.dark'
                  }
                }}
              >
                AI Investigation Assessment
              </Button>

              <Button
                variant="outlined"
                size="small"
                color="primary"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                onClick={exportCurrentPDF}
                disabled={loading}
                sx={{
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  borderColor: '#E5E7EB',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: '#eff6ff'
                  }
                }}
              >
                Export PDF
              </Button>

              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={loading}
                sx={{
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  borderColor: '#E5E7EB',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'error.main',
                    bgcolor: '#fef2f2'
                  }
                }}
              >
                Delete File
              </Button>
            </Box>
          </Box>

          {/* 2. Messages Pane */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', bgcolor: '#F9FAFB' }}>
            {currentConversation.messages.map((msg) => (
              <ChatBubble key={msg.messageId} msg={msg} />
            ))}

            {/* Assistant typing indicator */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Box
                  sx={{
                    bgcolor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
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
          <ChatInput onSend={sendChatMessage} disabled={loading} />
        </>
      ) : (
        /* ================== NEW CHAT / WELCOME SCREEN ================== */
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#F9FAFB', overflowY: 'auto' }}>
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
