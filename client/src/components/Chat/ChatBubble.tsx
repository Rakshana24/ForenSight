import React from 'react';
import { Box, Typography } from '@mui/material';
import type { Message } from '../../types';

interface ChatBubbleProps {
  msg: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ msg }) => {
  const isUser = msg.role.toLowerCase() === 'user';

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        width: '100%'
      }}
    >
      <Box
        sx={{
          maxWidth: '75%',
          backgroundColor: isUser ? '#eff6ff' : '#f8fafc',
          border: '1px solid',
          borderColor: isUser ? '#bfdbfe' : '#e2e8f0',
          borderRadius: 2,
          p: 2,
          boxShadow: 'none',
        }}
      >
        <Typography
          variant="subtitle2"
          color={isUser ? 'primary' : 'text.primary'}
          fontWeight="bold"
          gutterBottom
          sx={{ fontSize: '0.8rem' }}
        >
          {isUser ? 'User' : 'Assistant'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {msg.message}
        </Typography>
        {msg.timestamp && (
          <Typography
            variant="caption"
            color="text.disabled"
            display="block"
            textAlign="right"
            mt={0.5}
            sx={{ fontSize: '0.7rem' }}
          >
            {formatTime(msg.timestamp)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ChatBubble;
