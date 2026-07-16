import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useChat } from '../../contexts/ChatContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { conversations, createNewConversation, selectConversation, sessionId, loading } = useChat();
  const [tableSearch, setTableSearch] = useState('');

  const handleStartNew = async () => {
    try {
      const newId = await createNewConversation('New Investigation');
      navigate(`/chat/${newId}`);
    } catch (e) {
      // Handled in Context
    }
  };

  const handleOpenConvo = async (id: string) => {
    await selectConversation(id);
    navigate(`/chat/${id}`);
  };

  const handleContinueRecent = () => {
    if (conversations.length > 0) {
      handleOpenConvo(conversations[0].conversationId);
    }
  };

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

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', p: 3 }}>
      
      {/* 1. Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Box>
          <Typography variant="h4" color="text.primary" fontWeight="bold">
            Investigation Cockpit
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Analyze intelligence records, generate secure reports, and trace suspects.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleStartNew}
          disabled={loading}
          sx={{
            py: 1.2,
            px: 2.5,
            borderRadius: '6px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              bgcolor: 'primary.dark'
            }
          }}
        >
          New Investigation
        </Button>
      </Box>

      {/* 2. Responsive Statistics Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3.5 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                TOTAL CASES SAVED
              </Typography>
              <FolderSharedIcon color="primary" />
            </Box>
            <Typography variant="h3" color="text.primary" fontWeight="bold">
              {conversations.length}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              All recorded cases in database
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                MY SESSION CASES
              </Typography>
              <DescriptionIcon color="primary" />
            </Box>
            <Typography variant="h3" color="text.primary" fontWeight="bold">
              {conversations.filter(c => c.sessionId === sessionId).length}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Belonging to session: {sessionId}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                LATEST CASE FILING
              </Typography>
              <CheckCircleIcon sx={{ color: '#10B981' }} />
            </Box>
            <Typography variant="h6" color="text.primary" fontWeight="bold" sx={{ mt: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {conversations.length > 0 ? conversations[0].title : 'No cases recorded'}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
              {conversations.length > 0 ? `Created: ${formatTime(conversations[0].createdTime)}` : 'Start a case file to begin'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 4. Searchable Conversation History Table */}
      <Card sx={{ mt: 1, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HistoryIcon color="action" />
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              All Investigations History
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Search records..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            sx={{
              width: 260,
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                bgcolor: '#F5F6FA',
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
        
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: 'none', borderRadius: 0, flex: 1, overflowY: 'auto' }}>
          <Table stickyHeader size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F9FAFB', color: '#4B5563' }}>File Title</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F9FAFB', color: '#4B5563' }}>Created Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F9FAFB', color: '#4B5563' }}>Owner Session</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F9FAFB', color: '#4B5563' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#F9FAFB', color: '#4B5563' }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredConversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                    No investigation records match the filter query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredConversations.map((convo) => (
                  <TableRow
                    key={convo.conversationId}
                    hover
                    onClick={() => handleOpenConvo(convo.conversationId)}
                    sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell sx={{ fontWeight: '500', color: '#1F2937' }}>
                      {convo.title}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{formatTime(convo.createdTime)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{convo.sessionId}</TableCell>
                    <TableCell>
                      <Chip
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ borderRadius: '4px', fontWeight: 'bold', height: 22, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon fontSize="inherit" />}
                        sx={{ textTransform: 'none', fontWeight: 'bold', py: 0.5 }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Dashboard;
