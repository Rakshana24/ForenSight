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
        backgroundColor: isActive ? ((theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.06)') : 'transparent',
        border: '1px solid',
        borderColor: isActive ? 'primary.main' : 'divider',
        borderLeft: '4px solid',
        borderLeftColor: isActive ? 'primary.main' : 'text.disabled',
        boxShadow: isActive ? '0 1px 2px 0 rgba(0,0,0,0.05)' : 'none',
        '&.Mui-selected': {
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.06)',
          '&:hover': {
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.09)',
          }
        },
        '&:hover': {
          backgroundColor: 'action.hover',
          borderColor: 'primary.light'
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
                sx={{ flex: 1, fontWeight: isActive ? 'bold' : 500, color: isActive ? 'primary.main' : 'text.primary' }}
              >
                {convo.title.replace(/siri/gi, 'New')}
              </Typography>
              <Chip
                label="Active"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  bgcolor: isActive ? ((theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.09)') : 'action.selected',
                  color: isActive ? 'primary.main' : 'text.secondary',
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
              backgroundColor: 'rgba(239, 68, 68, 0.08)'
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
