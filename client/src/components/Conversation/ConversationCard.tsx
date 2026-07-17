import React from 'react';
import { ListItemButton, ListItemText, IconButton, Typography, Box, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ForumIcon from '@mui/icons-material/Forum';
import type { Conversation } from '../../types';

interface ConversationCardProps {
  convo: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({ convo, isActive, onSelect, onDelete }) => {
  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <ListItemButton
      selected={isActive}
      onClick={() => onSelect(convo.conversationId)}
      sx={{
        borderRadius: '6px',
        mb: 1,
        py: 1.2,
        px: 2,
        backgroundColor: isActive ? '#eff6ff' : '#ffffff',
        border: '1px solid',
        borderColor: isActive ? '#3b82f6' : '#e5e7eb',
        borderLeft: '4px solid',
        borderLeftColor: isActive ? '#1e3a8a' : '#94a3b8',
        boxShadow: isActive ? '0 1px 2px 0 rgba(0,0,0,0.05)' : 'none',
        '&.Mui-selected': {
          backgroundColor: '#eff6ff',
          '&:hover': {
            backgroundColor: '#dbeafe',
          }
        },
        '&:hover': {
          backgroundColor: '#f8fafc',
          borderColor: '#cbd5e1'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
        <ForumIcon fontSize="small" color={isActive ? 'primary' : 'action'} />
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ flex: 1, fontWeight: isActive ? 'bold' : 500, color: isActive ? '#1e3a8a' : '#1f2937' }}
              >
                {convo.title}
              </Typography>
              <Chip
                label="Active"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  bgcolor: isActive ? '#dbeafe' : '#f1f5f9',
                  color: isActive ? '#1e3a8a' : '#4b5563',
                  borderRadius: '3px',
                  px: 0.5,
                  '& .MuiChip-label': { px: 0 }
                }}
              />
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
              Created: {formatTime(convo.createdTime)}
            </Typography>
          }
          sx={{ my: 0, overflow: 'hidden' }}
        />
        <IconButton
          edge="end"
          size="small"
          onClick={(e) => onDelete(convo.conversationId, e)}
          sx={{
            ml: 1,
            color: 'text.disabled',
            '&:hover': {
              color: 'error.main',
              backgroundColor: '#fee2e2'
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </ListItemButton>
  );
};

export default ConversationCard;
