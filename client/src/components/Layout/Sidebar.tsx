import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, List, Divider, TextField, Typography, InputAdornment, ListItemButton, ListItemText } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useChat } from '../../contexts/ChatContext';
import ConversationCard from '../Conversation/ConversationCard';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    conversations,
    currentConversation,
    selectConversation,
    createNewConversation,
    deleteSelectedConversation,
    sessionId,
    setSessionId,
    loading
  } = useChat();

  const [searchTerm, setSearchTerm] = useState('');
  const [sessionInput, setSessionInput] = useState(sessionId);
  const [showSettings, setShowSettings] = useState(false);

  const handleStartNew = async () => {
    try {
      const newId = await createNewConversation('New Investigation');
      navigate(`/chat/${newId}`);
    } catch (e) {
      // Error handled by ChatContext
    }
  };

  const handleSelectConvo = async (id: string) => {
    await selectConversation(id);
    navigate(`/chat/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      const isActive = currentConversation?.conversationId === id;
      await deleteSelectedConversation(id);
      if (isActive) {
        navigate('/', { replace: true });
      }
    }
  };

  const handleSaveSession = () => {
    const cleanSession = sessionInput.trim();
    if (cleanSession) {
      setSessionId(cleanSession);
      setShowSettings(false);
      navigate('/');
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isDashboardActive = location.pathname === '/dashboard';

  return (
    <Box
      sx={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #E5E7EB',
        bgcolor: '#FFFFFF',
      }}
    >
      {/* 1. Sidebar Top Action Triggers */}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        
        {/* System Dashboard Link */}
        <ListItemButton
          selected={isDashboardActive}
          onClick={() => navigate('/dashboard')}
          sx={{
            borderRadius: '6px',
            py: 1,
            px: 1.5,
            bgcolor: isDashboardActive ? '#eff6ff' : 'transparent',
            border: '1px solid',
            borderColor: isDashboardActive ? '#3b82f6' : '#e5e7eb',
            '&.Mui-selected': {
              bgcolor: '#eff6ff',
              '&:hover': {
                bgcolor: '#dbeafe',
              }
            },
            '&:hover': {
              bgcolor: '#f8fafc',
            }
          }}
        >
          <DashboardIcon fontSize="small" color={isDashboardActive ? 'primary' : 'action'} sx={{ mr: 1.5 }} />
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: isDashboardActive ? 'primary.main' : 'text.primary' }}>
                System Dashboard
              </Typography>
            }
          />
        </ListItemButton>

        {/* Intelligence Link */}
        <ListItemButton
          selected={location.pathname === '/intelligence'}
          onClick={() => navigate('/intelligence')}
          sx={{
            borderRadius: '6px',
            py: 1,
            px: 1.5,
            bgcolor: location.pathname === '/intelligence' ? '#eff6ff' : 'transparent',
            border: '1px solid',
            borderColor: location.pathname === '/intelligence' ? '#3b82f6' : '#e5e7eb',
            '&.Mui-selected': {
              bgcolor: '#eff6ff',
              '&:hover': {
                bgcolor: '#dbeafe',
              }
            },
            '&:hover': {
              bgcolor: '#f8fafc',
            }
          }}
        >
          <SearchIcon fontSize="small" color={location.pathname === '/intelligence' ? 'primary' : 'action'} sx={{ mr: 1.5 }} />
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: location.pathname === '/intelligence' ? 'primary.main' : 'text.primary' }}>
                Intelligence
              </Typography>
            }
          />
        </ListItemButton>

        {/* Analytics Link */}
        <ListItemButton
          selected={location.pathname === '/analytics'}
          onClick={() => navigate('/analytics')}
          sx={{
            borderRadius: '6px',
            py: 1,
            px: 1.5,
            bgcolor: location.pathname === '/analytics' ? '#eff6ff' : 'transparent',
            border: '1px solid',
            borderColor: location.pathname === '/analytics' ? '#3b82f6' : '#e5e7eb',
            '&.Mui-selected': {
              bgcolor: '#eff6ff',
              '&:hover': {
                bgcolor: '#dbeafe',
              }
            },
            '&:hover': {
              bgcolor: '#f8fafc',
            }
          }}
        >
          <TrendingUpIcon fontSize="small" color={location.pathname === '/analytics' ? 'primary' : 'action'} sx={{ mr: 1.5 }} />
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: location.pathname === '/analytics' ? 'primary.main' : 'text.primary' }}>
                Analytics
              </Typography>
            }
          />
        </ListItemButton>

        {/* Start New Chat Button */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<AddIcon />}
          onClick={handleStartNew}
          disabled={loading}
          sx={{
            py: 1.2,
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              bgcolor: '#172554',
            }
          }}
        >
          New Investigation
        </Button>

        {/* Search Field */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '6px',
              bgcolor: '#F5F6FA',
              borderColor: '#E5E7EB',
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>

      <Divider />

      {/* 2. Scrollable Investigation Logs List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
          <ForumIcon fontSize="inherit" color="disabled" />
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}
          >
            Active Files ({filteredConversations.length})
          </Typography>
        </Box>

        {filteredConversations.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              No files recorded.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredConversations.map((convo) => (
              <ConversationCard
                key={convo.conversationId}
                convo={convo}
                isActive={location.pathname === `/chat/${convo.conversationId}`}
                onSelect={handleSelectConvo}
                onDelete={handleDelete}
              />
            ))}
          </List>
        )}
      </Box>

      <Divider />

      {/* 3. Bottom Settings Session Card */}
      <Box sx={{ p: 2.5, bgcolor: '#F5F6FA', borderTop: '1px solid #E5E7EB' }}>
        {showSettings ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              label="Session Identifier"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              sx={{ bgcolor: '#FFFFFF' }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                onClick={handleSaveSession}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => {
                  setSessionInput(sessionId);
                  setShowSettings(false);
                }}
                sx={{ textTransform: 'none' }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            onClick={() => setShowSettings(true)}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SettingsIcon fontSize="small" color="action" />
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
                >
                  ACTIVE BADGE
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'bold' }}>
                  {sessionId}
                </Typography>
              </Box>
            </Box>
            <Button size="small" variant="text" sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 'bold' }}>
              Edit
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
