import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, Divider, Grid, CircularProgress, Button } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonIcon from '@mui/icons-material/Person';
import GavelIcon from '@mui/icons-material/Gavel';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SchoolIcon from '@mui/icons-material/School';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import InfoIcon from '@mui/icons-material/Info';
import type { Message } from '../../types';
import { chatService } from '../../services/chatService';

interface ChatBubbleProps {
  msg: Message;
  originalPrompt?: string;
  audioCacheRef?: React.MutableRefObject<Record<string, string>>;
}

const parseCaseSummary = (text: string) => {
  const sections: { [key: string]: string[] } = {
    overview: [],
    summary: [],
    victim: [],
    criminal: [],
    investigation: [],
    findings: [],
    status: []
  };

  let currentSection = '';
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip divider lines
    if (trimmed.startsWith('---') || trimmed.startsWith('===')) continue;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith('case overview')) {
      currentSection = 'overview';
    } else if (lower.startsWith('summary')) {
      currentSection = 'summary';
    } else if (lower.startsWith('victim details')) {
      currentSection = 'victim';
    } else if (lower.startsWith('criminal details')) {
      currentSection = 'criminal';
    } else if (lower.startsWith('investigation')) {
      currentSection = 'investigation';
    } else if (lower.startsWith('key findings')) {
      currentSection = 'findings';
    } else if (lower.startsWith('current status')) {
      currentSection = 'status';
    } else {
      if (currentSection) {
        sections[currentSection].push(trimmed);
      }
    }
  }

  const getField = (lines: string[], keyName: string): string => {
    const found = lines.find(l => l.toLowerCase().startsWith(keyName.toLowerCase()));
    if (!found) return 'Information not available.';
    const parts = found.split(':');
    return parts.slice(1).join(':').trim() || 'Information not available.';
  };

  return {
    caseNumber: getField(sections.overview, 'Case Number'),
    crimeType: getField(sections.overview, 'Crime Type'),
    investigationStatus: getField(sections.overview, 'Investigation Status'),
    summaryText: sections.summary.join('\n'),
    victimDetails: sections.victim,
    criminalDetails: sections.criminal,
    officer: getField(sections.investigation, 'Investigating Officer'),
    policeStation: getField(sections.investigation, 'Police Station'),
    district: getField(sections.investigation, 'District'),
    court: getField(sections.investigation, 'Court Handling'),
    findings: sections.findings.map(f => f.replace(/^•\s*/, '')),
    currentStatus: sections.status.join('\n')
  };
};

const parseCaseAssessment = (text: string) => {
  const sections: { [key: string]: string[] } = {
    status: [],
    outcome: [],
    overview: [],
    findings: [],
    gaps: [],
    actions: [],
    risk: [],
    success: [],
    lessons: [],
    quality: [],
    assessment: []
  };

  let currentSection = '';
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('---') || trimmed.startsWith('===')) continue;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith('investigation status') || lower.startsWith('case status')) {
      currentSection = 'status';
      sections.status.push(trimmed);
    } else if (lower.startsWith('case outcome')) {
      currentSection = 'outcome';
      sections.outcome.push(trimmed);
    } else if (lower.startsWith('case overview')) {
      currentSection = 'overview';
    } else if (lower.startsWith('key findings')) {
      currentSection = 'findings';
    } else if (lower.startsWith('investigation gaps')) {
      currentSection = 'gaps';
    } else if (lower.startsWith('recommended next actions')) {
      currentSection = 'actions';
    } else if (lower.startsWith('risk level')) {
      currentSection = 'risk';
      sections.risk.push(trimmed);
    } else if (lower.startsWith('success factors')) {
      currentSection = 'success';
    } else if (lower.startsWith('lessons learned')) {
      currentSection = 'lessons';
    } else if (lower.startsWith('case quality assessment')) {
      currentSection = 'quality';
      sections.quality.push(trimmed);
    } else if (lower.startsWith('overall ai assessment')) {
      currentSection = 'assessment';
    } else {
      if (currentSection) {
        sections[currentSection].push(trimmed);
      }
    }
  }

  const getCleanText = (lines: string[]): string => {
    return lines.join('\n').trim();
  };

  const getCleanList = (lines: string[]): string[] => {
    return lines.map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean);
  };

  const getFieldVal = (lines: string[], keyName: string): string => {
    const found = lines.find(l => l.toLowerCase().startsWith(keyName.toLowerCase()));
    if (!found) return '';
    const parts = found.split(':');
    return parts.slice(1).join(':').trim();
  };

  const isClosed = text.toLowerCase().includes('case status') && text.toLowerCase().includes('case outcome');

  return {
    isClosed,
    status: getFieldVal(sections.status, 'Investigation Status') || getFieldVal(sections.status, 'Case Status') || (isClosed ? 'Closed' : 'Active'),
    outcome: getFieldVal(sections.outcome, 'Case Outcome') || getCleanText(sections.outcome) || 'Investigation completed.',
    overview: getCleanText(sections.overview),
    findings: getCleanList(sections.findings),
    gaps: getCleanList(sections.gaps),
    actions: getCleanList(sections.actions),
    risk: getFieldVal(sections.risk, 'Risk Level'),
    success: getCleanList(sections.success),
    lessons: getCleanList(sections.lessons),
    quality: getFieldVal(sections.quality, 'Case Quality Assessment'),
    assessment: getCleanText(sections.assessment)
  };
};

const parseInvestigationTimeline = (text: string) => {
  const events: { date: string; description: string }[] = [];
  let status = 'Active';
  let overallSummary = '';

  const lines = text.split('\n');
  let currentSection = ''; // 'status', 'timeline', 'summary'
  let currentDate = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('---') || trimmed.startsWith('===')) continue;

    const lower = trimmed.toLowerCase();
    if (lower.startsWith('case status')) {
      currentSection = 'status';
    } else if (lower.startsWith('timeline')) {
      currentSection = 'timeline';
    } else if (lower.startsWith('overall timeline summary')) {
      currentSection = 'summary';
    } else {
      if (currentSection === 'status') {
        status = trimmed;
      } else if (currentSection === 'timeline') {
        if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const description = trimmed.replace(/^[•*\-]\s*/, '').trim();
          events.push({
            date: currentDate || 'Date not available.',
            description: description
          });
        } else {
          currentDate = trimmed;
        }
      } else if (currentSection === 'summary') {
        overallSummary += (overallSummary ? '\n' : '') + trimmed;
      }
    }
  }

  return {
    status,
    events,
    overallSummary: overallSummary.trim() || 'Timeline based on available investigation records.'
  };
};

const renderListSection = (lines: string[]) => {
  if (lines.length === 0) {
    return <Typography variant="body2" color="text.secondary">Information not available.</Typography>;
  }
  return lines.map((line, idx) => {
    const parts = line.split(':');
    if (parts.length > 1) {
      const label = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      return (
        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', minWidth: '80px' }}>
            {label}:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {val}
          </Typography>
        </Box>
      );
    }
    return (
      <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {line}
      </Typography>
    );
  });
};

const renderVisualTimeline = (status: string, events: { date: string; description: string }[]) => {
  const isClosed = status.toLowerCase().includes('closed');
  
  return (
    <Box sx={{ position: 'relative', pl: 4, py: 1 }}>
      {/* Vertical Line */}
      <Box
        sx={{
          position: 'absolute',
          left: '15px',
          top: 0,
          bottom: 0,
          width: '2px',
          bgcolor: isClosed ? '#cbd5e1' : '#bfdbfe',
          zIndex: 1
        }}
      />

      {events.map((ev, idx) => {
        const isDateAvailable = ev.date && ev.date.toLowerCase() !== 'date not available.';
        const isLast = idx === events.length - 1;
        
        let dotColor = '#3b82f6'; // Blue
        if (!isDateAvailable) dotColor = '#94a3b8'; // Grey
        else if (ev.description.toLowerCase().includes('arrest') || ev.description.toLowerCase().includes('closed')) {
          dotColor = '#10b981'; // Green
        } else if (ev.description.toLowerCase().includes('incident')) {
          dotColor = '#f59e0b'; // Amber
        }

        return (
          <Box
            key={idx}
            sx={{
              position: 'relative',
              mb: isLast ? 0 : 3,
              display: 'flex',
              alignItems: 'flex-start',
              '&:hover .timeline-dot': {
                transform: 'scale(1.3)',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)'
              },
              '&:hover .timeline-card': {
                bgcolor: '#f1f5f9',
                transform: 'translateX(4px)'
              }
            }}
          >
            {/* Timeline Dot Node */}
            <Box
              className="timeline-dot"
              sx={{
                position: 'absolute',
                left: '-25px',
                top: '6px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                bgcolor: dotColor,
                border: '3px solid #FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                zIndex: 2,
                transition: 'all 0.2s ease-in-out'
              }}
            />

            {/* Event Details Card */}
            <Box
              className="timeline-card"
              sx={{
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 1.5,
                p: 1.5,
                transition: 'all 0.2s ease-in-out',
                display: 'inline-block',
                minWidth: '220px',
                maxWidth: '100%'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 'bold',
                  color: isDateAvailable ? (isClosed ? '#475569' : '#1d4ed8') : '#64748b',
                  display: 'block',
                  mb: 0.5
                }}
              >
                {ev.date}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: '500', color: '#1e293b' }}>
                {ev.description}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const renderInteractiveTimeline = (
  status: string,
  events: { date: string; description: string }[],
  expandedMilestones: Record<number, boolean>,
  toggleMilestone: (idx: number) => void,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onJumpToLatest: () => void
) => {
  const isClosed = status.toLowerCase().includes('closed');
  const totalEvents = events.length;

  const milestones = events.map((ev, idx) => {
    const desc = ev.description.trim();
    const lowerDesc = desc.toLowerCase();

    let title = desc;
    let description = desc;
    let stage = 'Investigation';
    let milestoneStatus = 'Completed';

    if (lowerDesc.includes('incident occurred') || lowerDesc.includes('incident happen')) {
      title = 'Incident Occurred';
      description = 'The incident occurred and was reported/discovered.';
      stage = 'Incident';
    } else if (lowerDesc.includes('fir registered')) {
      title = 'FIR Registered';
      description = 'First Information Report (FIR) formally registered at the police station.';
      stage = 'Registration';
    } else if (lowerDesc.includes('complaint filed')) {
      title = 'Complaint Filed';
      description = 'Formal written complaint submitted by the victim/complainant.';
      stage = 'Registration';
    } else if (lowerDesc.includes('assigned to officer') || lowerDesc.includes('investigation assigned')) {
      title = 'Investigation Assigned';
      const officerMatch = desc.match(/officer\s+(.+)/i);
      const officerName = officerMatch ? officerMatch[1] : 'Officer';
      description = `Case officially assigned to Investigating Officer ${officerName}.`;
      stage = 'Investigation';
    } else if (lowerDesc.includes('victim statement')) {
      const victimMatch = desc.match(/for\s+(.+)/i);
      const victimName = victimMatch ? victimMatch[1] : 'the victim';
      description = `Victim statement recorded under Section 161 CrPC for ${victimName}.`;
      stage = 'Statement';
    } else if (lowerDesc.includes('suspect identified')) {
      const suspectMatch = desc.match(/identified:\s*(.+)/i);
      const suspectName = suspectMatch ? suspectMatch[1] : 'suspect';
      title = 'Suspect Identified';
      description = `Potential suspect ${suspectName} identified through database correlation and investigative leads.`;
      stage = 'Investigation';
    } else if (lowerDesc.includes('witness statement')) {
      title = 'Witness Statements';
      description = 'Key witness statements recorded and signed under Section 161 CrPC.';
      stage = 'Statement';
    } else if (lowerDesc.includes('evidence collected')) {
      title = 'Evidence Collection';
      description = 'Physical, digital, and scientific evidence retrieved from the scene and logged.';
      stage = 'Evidence';
    } else if (lowerDesc.includes('arrest') || lowerDesc.includes('arrested')) {
      title = 'Arrest Made';
      description = 'Suspect arrested, rights read, and remanded to judicial or police custody.';
      stage = 'Arrest';
    } else if (lowerDesc.includes('chargesheet') || lowerDesc.includes('charge sheet')) {
      title = 'Chargesheet Filed';
      description = 'Final investigation report and charge sheet submitted to the jurisdictional magistrate court.';
      stage = 'Chargesheet';
    } else if (lowerDesc.includes('under trial')) {
      title = 'Case Under Trial';
      description = 'Case is currently pending trial hearings in court.';
      stage = 'Trial';
      milestoneStatus = isClosed ? 'Completed' : 'In Progress';
    }

    const isLast = idx === totalEvents - 1;
    if (isLast && !isClosed && milestoneStatus !== 'Completed') {
      milestoneStatus = 'In Progress';
    }

    return {
      date: ev.date,
      title,
      description,
      stage,
      status: milestoneStatus
    };
  });

  const hasMissingDates = events.some(ev => !ev.date || ev.date.toLowerCase() === 'date not available.');

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Click milestone cards to expand or collapse details.
        </Typography>
        <Box
          onClick={onJumpToLatest}
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.75rem',
            color: '#1d4ed8',
            fontWeight: 'bold',
            '&:hover': {
              textDecoration: 'underline',
              color: '#1e40af'
            }
          }}
        >
          <span>↓</span> Jump to Latest
        </Box>
      </Box>

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          maxHeight: '380px',
          overflowY: 'auto',
          pl: 4.5,
          pr: 1.5,
          py: 1.5,
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          bgcolor: '#f8fafc',
          scrollBehavior: 'smooth'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '18px',
            top: '20px',
            bottom: '20px',
            width: '2px',
            bgcolor: isClosed ? '#cbd5e1' : '#bfdbfe',
            zIndex: 1
          }}
        />

        {milestones.map((ms, idx) => {
          const isExpanded = !!expandedMilestones[idx];
          const isLast = idx === totalEvents - 1;
          const isActive = ms.status === 'In Progress';
          
          let dotColor = '#3b82f6';
          if (isActive) dotColor = '#f59e0b';
          else if (isClosed && isLast) dotColor = '#10b981';
          else if (ms.date.toLowerCase() === 'date not available.') dotColor = '#94a3b8';

          return (
            <Box
              key={idx}
              sx={{
                position: 'relative',
                mb: isLast ? 0.5 : 2.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: '-24px',
                  top: '12px',
                  width: isActive ? '12px' : '10px',
                  height: isActive ? '12px' : '10px',
                  borderRadius: '50%',
                  bgcolor: dotColor,
                  border: '3px solid #FFFFFF',
                  boxShadow: isActive ? '0 0 0 3px rgba(245, 158, 11, 0.4)' : '0 1px 3px rgba(0,0,0,0.15)',
                  zIndex: 2,
                  animation: isActive ? 'pulseTimeline 2s infinite' : 'none',
                  '@keyframes pulseTimeline': {
                    '0%': { boxShadow: '0 0 0 0px rgba(245, 158, 11, 0.5)' },
                    '70%': { boxShadow: '0 0 0 6px rgba(245, 158, 11, 0)' },
                    '100%': { boxShadow: '0 0 0 0px rgba(245, 158, 11, 0)' }
                  }
                }}
              />

              <Box
                onClick={() => toggleMilestone(idx)}
                sx={{
                  width: '100%',
                  cursor: 'pointer',
                  p: 2,
                  bgcolor: isActive ? '#eff6ff' : '#ffffff',
                  border: isActive ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: 2,
                  boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: isActive ? '#eff6ff' : '#f8fafc',
                    transform: 'translateX(4px)',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 'bold',
                          color: '#64748b',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {ms.date}
                      </Typography>
                      {isActive && (
                        <Box
                          sx={{
                            bgcolor: '#f59e0b',
                            color: '#ffffff',
                            px: 1,
                            borderRadius: 0.5,
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          Active Stage
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: '600', color: '#0f172a' }}>
                      {ms.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    {isExpanded ? '▲' : '▼'}
                  </Typography>
                </Box>

                {isExpanded && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="body2" sx={{ color: '#334155', mb: 1.5, lineHeight: 1.5 }}>
                      {ms.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Box
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: '#475569',
                          px: 1,
                          py: 0.5,
                          borderRadius: 0.5,
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}
                      >
                        STAGE: {ms.stage.toUpperCase()}
                      </Box>
                      <Box
                        sx={{
                          bgcolor: ms.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                          color: ms.status === 'Completed' ? '#15803d' : '#b45309',
                          px: 1,
                          py: 0.5,
                          borderRadius: 0.5,
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}
                      >
                        STATUS: {ms.status.toUpperCase()}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {hasMissingDates && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1.5, textAlign: 'center', fontStyle: 'italic' }}
        >
          Timeline generated using available investigation records.
        </Typography>
      )}
    </Box>
  );
};

interface SimilarCase {
  caseTitle: string;
  score: string;
  reasons: string[];
  outcome: string;
}

interface SimilarCasesData {
  cases: SimilarCase[];
  observation: string;
}

const parseSimilarCases = (text: string): SimilarCasesData => {
  const cases: SimilarCase[] = [];
  let observation = '';

  let cleanedText = text;
  const headerIdx = text.toLowerCase().indexOf('similar cases');
  if (headerIdx !== -1) {
    cleanedText = text.substring(headerIdx);
  }

  const lines = cleanedText.split('\n');
  let currentCase: Partial<SimilarCase> | null = null;
  let currentSection: 'reasons' | 'observation' | 'score' | 'outcome' | '' = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('---') || trimmed.startsWith('===')) {
      if (currentCase && currentCase.caseTitle) {
        cases.push(currentCase as SimilarCase);
        currentCase = null;
      }
      currentSection = '';
      continue;
    }

    const lower = trimmed.toLowerCase();

    if (lower.startsWith('case ')) {
      if (currentCase && currentCase.caseTitle) {
        cases.push(currentCase as SimilarCase);
      }
      currentCase = {
        caseTitle: trimmed,
        reasons: [],
        score: '',
        outcome: ''
      };
      currentSection = '';
    } else if (lower.startsWith('similarity score')) {
      currentSection = 'score';
    } else if (lower.startsWith('reason for match')) {
      currentSection = 'reasons';
    } else if (lower.startsWith('outcome')) {
      currentSection = 'outcome';
    } else if (lower.startsWith('overall ai observation')) {
      currentSection = 'observation';
      if (currentCase && currentCase.caseTitle) {
        cases.push(currentCase as SimilarCase);
        currentCase = null;
      }
    } else {
      if (currentSection === 'score' && currentCase) {
        currentCase.score = trimmed;
      } else if (currentSection === 'reasons' && currentCase) {
        const cleanedReason = trimmed.replace(/^[•*\-]\s*/, '').trim();
        currentCase.reasons?.push(cleanedReason);
      } else if (currentSection === 'outcome' && currentCase) {
        currentCase.outcome = trimmed;
      } else if (currentSection === 'observation') {
        observation += (observation ? '\n' : '') + trimmed;
      }
    }
  }

  if (currentCase && currentCase.caseTitle) {
    cases.push(currentCase as SimilarCase);
  }

  return {
    cases,
    observation: observation.trim()
  };
};

const renderSimilarCasesCard = (data: SimilarCasesData) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
        {data.cases.map((c, idx) => {
          const scoreNum = parseInt(c.score) || 0;
          let scoreBg = '#64748b';
          if (scoreNum >= 90) scoreBg = '#10b981';
          else if (scoreNum >= 80) scoreBg = '#3b82f6';
          else if (scoreNum >= 70) scoreBg = '#f59e0b';

          return (
            <Card
              key={idx}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                      {c.caseTitle}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Box
                        sx={{
                          bgcolor: c.outcome.toLowerCase().includes('convicted') ? '#dcfce7' : '#eff6ff',
                          color: c.outcome.toLowerCase().includes('convicted') ? '#15803d' : '#1e40af',
                          px: 1,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}
                      >
                        {c.outcome}
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      bgcolor: scoreBg,
                      color: '#ffffff',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      textAlign: 'center',
                      minWidth: '45px'
                    }}
                  >
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', lineHeight: 1 }}>
                      MATCH
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.1, mt: 0.25 }}>
                      {c.score}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 1, letterSpacing: '0.5px' }}>
                  REASON FOR MATCH
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {c.reasons.map((r, rIdx) => (
                    <Box key={rIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ color: scoreBg, fontSize: '0.85rem' }}>✓</span>
                      <Typography variant="body2" sx={{ color: '#334155' }}>
                        {r}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {data.observation && (
        <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 2, p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#b45309', mb: 1 }}>
            OVERALL AI OBSERVATION
          </Typography>
          <Typography variant="body2" sx={{ color: '#78350f', lineHeight: 1.6 }}>
            {data.observation}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface InvestigationLead {
  leadTitle: string;
  action: string;
  reason: string;
  impact: string;
  priority: string;
}

interface InvestigationLeadsData {
  leads: InvestigationLead[];
  overallRecommendation: string;
}

const parseInvestigationLeads = (text: string): InvestigationLeadsData => {
  const leads: InvestigationLead[] = [];
  let overallRecommendation = '';

  let cleanedText = text;
  const headerIdx = text.toLowerCase().indexOf('ai investigation leads');
  if (headerIdx !== -1) {
    cleanedText = text.substring(headerIdx);
  }

  const lines = cleanedText.split('\n');
  let currentLead: Partial<InvestigationLead> | null = null;
  let currentSection: 'action' | 'reason' | 'impact' | 'priority' | 'recommendation' | '' = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('---') || trimmed.startsWith('===')) {
      if (currentLead && currentLead.leadTitle) {
        leads.push(currentLead as InvestigationLead);
        currentLead = null;
      }
      currentSection = '';
      continue;
    }

    const lower = trimmed.toLowerCase();

    if (lower.startsWith('lead ')) {
      if (currentLead && currentLead.leadTitle) {
        leads.push(currentLead as InvestigationLead);
      }
      currentLead = {
        leadTitle: trimmed,
        action: '',
        reason: '',
        impact: '',
        priority: ''
      };
      currentSection = 'action';
    } else if (lower.startsWith('reason')) {
      currentSection = 'reason';
    } else if (lower.startsWith('expected impact')) {
      currentSection = 'impact';
    } else if (lower.startsWith('priority')) {
      currentSection = 'priority';
    } else if (lower.startsWith('overall ai recommendation') || lower.startsWith('overall recommendation')) {
      currentSection = 'recommendation';
      if (currentLead && currentLead.leadTitle) {
        leads.push(currentLead as InvestigationLead);
        currentLead = null;
      }
    } else {
      if (currentSection === 'action' && currentLead) {
        currentLead.action = (currentLead.action ? currentLead.action + ' ' : '') + trimmed;
      } else if (currentSection === 'reason') {
        if (currentLead) currentLead.reason = (currentLead.reason ? currentLead.reason + ' ' : '') + trimmed;
      } else if (currentSection === 'impact' && currentLead) {
        currentLead.impact = (currentLead.impact ? currentLead.impact + ' ' : '') + trimmed;
      } else if (currentSection === 'priority' && currentLead) {
        currentLead.priority = trimmed;
      } else if (currentSection === 'recommendation') {
        overallRecommendation += (overallRecommendation ? '\n' : '') + trimmed;
      }
    }
  }

  if (currentLead && currentLead.leadTitle) {
    leads.push(currentLead as InvestigationLead);
  }

  return {
    leads,
    overallRecommendation: overallRecommendation.trim()
  };
};

const renderInvestigationLeadsCard = (data: InvestigationLeadsData) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
        {data.leads.map((l, idx) => {
          let priorityBg = '#cbd5e1';
          let priorityColor = '#475569';
          const p = l.priority.toLowerCase();
          if (p.includes('high')) {
            priorityBg = '#fee2e2';
            priorityColor = '#dc2626';
          } else if (p.includes('medium')) {
            priorityBg = '#ffedd5';
            priorityColor = '#d97706';
          } else if (p.includes('low')) {
            priorityBg = '#f1f5f9';
            priorityColor = '#64748b';
          }

          return (
            <Card
              key={idx}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                    {l.leadTitle}: {l.action}
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: priorityBg,
                      color: priorityColor,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {l.priority} Priority
                  </Box>
                </Box>

                <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
                      RATIONALE / REASON
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
                      {l.reason || 'No rationale provided.'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, letterSpacing: '0.5px' }}>
                      EXPECTED IMPACT
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
                      {l.impact || 'No expected impact provided.'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {data.overallRecommendation && (
        <Box sx={{ bgcolor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 2, p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#6d28d9', mb: 1 }}>
            OVERALL AI RECOMMENDATION
          </Typography>
          <Typography variant="body2" sx={{ color: '#5b21b6', lineHeight: 1.6 }}>
            {data.overallRecommendation}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface VoicePlayerProps {
  messageId: string;
  text: string;
  originalPrompt: string;
  audioCacheRef: React.MutableRefObject<Record<string, string>>;
  audioBase64?: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ messageId, text, originalPrompt, audioCacheRef, audioBase64 }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(audioBase64 || audioCacheRef.current[messageId] || null);
  const [loading, setLoading] = useState<boolean>(!audioBase64 && !audioCacheRef.current[messageId]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;

    const loadAndPlayAudio = async () => {
      // If base64 audio payload is provided, use it directly for simultaneous playback
      if (audioBase64) {
        setAudioUrl(audioBase64);
        setLoading(false);

        // Autoplay voice response
        const audio = new Audio(audioBase64);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onpause = () => setIsPlaying(false);
        audio.play().catch((e) => {
          console.warn('Speech autoplay failed or was blocked by browser:', e);
        });
        return;
      }

      if (audioCacheRef.current[messageId]) {
        setAudioUrl(audioCacheRef.current[messageId]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);
      try {
        const blob = await chatService.generateTTS(text, originalPrompt, true);
        if (!active) return;
        const url = URL.createObjectURL(blob);
        audioCacheRef.current[messageId] = url;
        setAudioUrl(url);
        setLoading(false);

        // Autoplay voice response
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onpause = () => setIsPlaying(false);
        audio.play().catch((e) => {
          console.warn('Speech autoplay failed or was blocked by browser:', e);
        });
      } catch (err) {
        console.error('[VoicePlayer] Failed to load/synthesize audio:', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadAndPlayAudio();

    return () => {
      active = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [messageId, text, originalPrompt, audioCacheRef, audioBase64]);

  const handlePlayAgain = () => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    audio.play().catch((e) => console.error('[VoicePlayer] Playback error:', e));
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          🔊 Generating Voice...
        </Typography>
      </Box>
    );
  }

  if (error || !audioUrl) {
    return null; // Fail silently, keeping text response
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
      {isPlaying ? (
        <Button
          variant="outlined"
          size="small"
          onClick={handlePause}
          sx={{
            py: 0.25,
            px: 1,
            fontSize: '0.75rem',
            textTransform: 'none',
            borderRadius: '4px',
            borderColor: '#E5E7EB',
            color: 'text.secondary',
            '&:hover': { bgcolor: '#f3f4f6' }
          }}
        >
          ⏸ Pause
        </Button>
      ) : (
        <Button
          variant="outlined"
          size="small"
          onClick={handlePlayAgain}
          sx={{
            py: 0.25,
            px: 1,
            fontSize: '0.75rem',
            textTransform: 'none',
            borderRadius: '4px',
            borderColor: '#E5E7EB',
            color: 'text.secondary',
            '&:hover': { bgcolor: '#f3f4f6' }
          }}
        >
          ▶ Play Again
        </Button>
      )}
    </Box>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ msg, originalPrompt, audioCacheRef }) => {
  const isUser = msg.role.toLowerCase() === 'user';
  const [showInteractive, setShowInteractive] = React.useState(true);
  const [expandedMilestones, setExpandedMilestones] = React.useState<Record<number, boolean>>({});
  const timelineContainerRef = React.useRef<HTMLDivElement>(null);

  const toggleMilestone = (idx: number) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const jumpToLatest = () => {
    if (timelineContainerRef.current) {
      timelineContainerRef.current.scrollTop = timelineContainerRef.current.scrollHeight;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isTimeline = !isUser && msg.message.includes('INVESTIGATION TIMELINE') && msg.message.includes('TIMELINE') && msg.message.includes('OVERALL TIMELINE SUMMARY');

  if (isTimeline) {
    const timeline = parseInvestigationTimeline(msg.message);
    const cardBorderColor = timeline.status.toLowerCase().includes('closed') ? '#e5e7eb' : '#bfdbfe';
    const headerGradient = timeline.status.toLowerCase().includes('closed')
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2.5,
          width: '100%'
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: '85%',
            border: `1px solid ${cardBorderColor}`,
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 3,
              background: headerGradient,
              color: '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#38bdf8' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                AI Investigation Timeline
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                onClick={() => setShowInteractive(!showInteractive)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  px: 2,
                  py: 0.75,
                  borderRadius: 1.5,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    transform: 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  }
                }}
              >
                {showInteractive ? 'Show Plain Text' : 'View Visual Timeline'}
              </Box>
              <Box
                sx={{
                  bgcolor: timeline.status.toLowerCase().includes('closed') ? '#475569' : '#1d4ed8',
                  color: '#ffffff',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}
              >
                {timeline.status}
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {showInteractive ? (
              /* Interactive Timeline Section */
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 2 }}>
                  INTERACTIVE LIFE CYCLE
                </Typography>
                {renderInteractiveTimeline(
                  timeline.status,
                  timeline.events,
                  expandedMilestones,
                  toggleMilestone,
                  timelineContainerRef,
                  jumpToLatest
                )}
              </Box>
            ) : (
              /* Visual Timeline Section */
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 2 }}>
                  CHRONOLOGICAL LIFE CYCLE
                </Typography>
                {renderVisualTimeline(timeline.status, timeline.events)}
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            {/* Overall AI Summary */}
            <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 1.5, p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 1 }}>
                OVERALL TIMELINE SUMMARY
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {timeline.overallSummary || 'Timeline based on available investigation records.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const isSummary = !isUser && msg.message.includes('CASE OVERVIEW') && msg.message.includes('SUMMARY') && msg.message.includes('VICTIM DETAILS');

  if (isSummary) {
    const summary = parseCaseSummary(msg.message);
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2.5,
          width: '100%'
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: '85%',
            border: '1px solid #bfdbfe',
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}
        >
          {/* Card Title Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 2,
              px: 3,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#FFFFFF'
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#38bdf8' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
              AI Investigation Case Summary
            </Typography>
          </Box>

          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {/* 1. Case Overview Section */}
            <Box
              sx={{
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 1.5,
                p: 2,
                mb: 3
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 1.5 }}>
                CASE OVERVIEW
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Case Number</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>{summary.caseNumber}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Crime Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{summary.crimeType}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Investigation Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#10b981' }}>{summary.investigationStatus}</Typography>
                </Grid>
              </Grid>
            </Box>

            {/* 2. Short Summary Callout */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 1 }}>
              SUMMARY
            </Typography>
            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6, mb: 3 }}>
              {summary.summaryText || 'Information not available.'}
            </Typography>

            <Divider sx={{ mb: 2.5 }} />

            {/* 3. Victims & Criminals Details */}
            <Grid container spacing={4} sx={{ mb: 2.5 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PersonIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                    VICTIM DETAILS
                  </Typography>
                </Box>
                {renderListSection(summary.victimDetails)}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PersonIcon color="error" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                    CRIMINAL DETAILS
                  </Typography>
                </Box>
                {renderListSection(summary.criminalDetails)}
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2.5 }} />

            {/* 4. Investigation Context */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 1.5 }}>
              INVESTIGATION DETAILS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <LocalPoliceIcon sx={{ color: '#64748b', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Officer:</Typography>
                  <Typography variant="body2" color="text.secondary">{summary.officer}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <BusinessIcon sx={{ color: '#64748b', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Police Station:</Typography>
                  <Typography variant="body2" color="text.secondary">{summary.policeStation}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <BusinessIcon sx={{ color: '#64748b', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>District:</Typography>
                  <Typography variant="body2" color="text.secondary">{summary.district}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <GavelIcon sx={{ color: '#64748b', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Court Handling:</Typography>
                  <Typography variant="body2" color="text.secondary">{summary.court}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2.5 }} />

            {/* 5. Key Findings */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 1.5 }}>
              KEY FINDINGS
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {summary.findings.length > 0 ? (
                summary.findings.map((f, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Typography color="primary" sx={{ mt: -0.2 }}>•</Typography>
                    <Typography variant="body2" color="text.secondary">{f}</Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">Information not available.</Typography>
              )}
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* 6. Current Status */}
            <Box
              sx={{
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 1.5,
                p: 2
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 0.5 }}>
                CURRENT STATUS
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 'bold' }}>
                {summary.currentStatus || 'Information not available.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const isUnavailable = !isUser && msg.message.trim().startsWith('Case status unavailable.');

  if (isUnavailable) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2.5,
          width: '100%'
        }}
      >
        <Box
          sx={{
            maxWidth: '75%',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: 2,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <WarningIcon sx={{ color: '#d97706' }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#b45309', mb: 0.5 }}>
              AI Investigation Assessment Mismatch
            </Typography>
            <Typography variant="body2" sx={{ color: '#d97706' }}>
              Case status unavailable. Please ensure a case status has been established before performing this assessment.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  const isAssessment = !isUser && (
    (msg.message.includes('INVESTIGATION STATUS') && msg.message.includes('INVESTIGATION GAPS')) ||
    (msg.message.includes('CASE STATUS') && msg.message.includes('CASE OUTCOME') && msg.message.includes('SUCCESS FACTORS'))
  );

  if (isAssessment) {
    const assess = parseCaseAssessment(msg.message);
    const cardBorderColor = assess.isClosed ? '#e5e7eb' : '#bfdbfe';
    const headerGradient = assess.isClosed 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' 
      : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2.5,
          width: '100%'
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: '85%',
            border: `1px solid ${cardBorderColor}`,
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 3,
              background: headerGradient,
              color: '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#38bdf8' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                AI Investigation Assessment
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: assess.isClosed ? '#475569' : '#1d4ed8',
                color: '#ffffff',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              {assess.status}
            </Box>
          </Box>

          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {/* Overview / Facts Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a', mb: 1 }}>
                CASE OVERVIEW
              </Typography>
              <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>
                {assess.overview || 'Information not available.'}
              </Typography>
            </Box>

            {/* Case Outcome (for closed cases) */}
            {assess.isClosed && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderLeft: '4px solid #475569', borderRadius: '0 4px 4px 0' }}>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Case Outcome
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1e293b', mt: 0.5 }}>
                  {assess.outcome}
                </Typography>
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            {/* Findings & Risk / Success Factors */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Findings List */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <InfoIcon sx={{ color: assess.isClosed ? '#475569' : '#2563eb', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                    KEY FINDINGS
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {assess.findings.length > 0 ? (
                    assess.findings.map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <Typography sx={{ color: assess.isClosed ? '#475569' : '#2563eb', mt: -0.2 }}>•</Typography>
                        <Typography variant="body2" color="text.secondary">{f}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Information not available.</Typography>
                  )}
                </Box>
              </Grid>

              {/* Gaps (Active) or Success Factors (Closed) */}
              <Grid size={{ xs: 12, md: 6 }}>
                {!assess.isClosed ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <HelpOutlineIcon sx={{ color: '#ea580c', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                        INVESTIGATION GAPS
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {assess.gaps.length > 0 ? (
                        assess.gaps.map((g, i) => (
                          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Typography sx={{ color: '#ea580c', mt: -0.2 }}>•</Typography>
                            <Typography variant="body2" color="text.secondary">{g}</Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Information not available.</Typography>
                      )}
                    </Box>
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                        SUCCESS FACTORS
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {assess.success.length > 0 ? (
                        assess.success.map((s, i) => (
                          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Typography sx={{ color: '#16a34a', mt: -0.2 }}>•</Typography>
                            <Typography variant="body2" color="text.secondary">{s}</Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Information not available.</Typography>
                      )}
                    </Box>
                  </>
                )}
              </Grid>
            </Grid>

            <Divider sx={{ mb: 3 }} />

            {/* Next Actions (Active) or Lessons Learned (Closed) */}
            <Box sx={{ mb: 3 }}>
              {!assess.isClosed ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <AssignmentTurnedInIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                      RECOMMENDED NEXT ACTIONS
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {assess.actions.length > 0 ? (
                      assess.actions.map((a, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Typography sx={{ color: '#2563eb', mt: -0.2 }}>•</Typography>
                          <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: '500' }}>{a}</Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">Information not available.</Typography>
                    )}
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <SchoolIcon sx={{ color: '#4b5563', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                      LESSONS LEARNED
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {assess.lessons.length > 0 ? (
                      assess.lessons.map((l, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Typography sx={{ color: '#4b5563', mt: -0.2 }}>•</Typography>
                          <Typography variant="body2" color="text.secondary">{l}</Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">Information not available.</Typography>
                    )}
                  </Box>
                </>
              )}
            </Box>

            {/* Risk / Quality Callout */}
            <Box
              sx={{
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 1.5,
                p: 2,
                mb: 3
              }}
            >
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {!assess.isClosed ? 'Risk Level Assessment' : 'Case Quality Rating'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {!assess.isClosed ? (
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 'bold',
                          color: assess.risk?.toLowerCase() === 'high' 
                            ? '#dc2626' 
                            : (assess.risk?.toLowerCase() === 'medium' ? '#ea580c' : '#16a34a')
                        }}
                      >
                        {assess.risk || 'Low'}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 'bold',
                          color: assess.quality?.toLowerCase().includes('needs') 
                            ? '#dc2626' 
                            : (assess.quality?.toLowerCase() === 'average' ? '#ea580c' : '#16a34a')
                        }}
                      >
                        {assess.quality || 'Good'}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Overall AI Assessment */}
            <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 1.5, p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 1 }}>
                OVERALL AI ASSESSMENT
              </Typography>
              <Typography variant="body2" sx={{ color: '#1e40af', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {assess.assessment || 'Information not available.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const isSimilarCases = !isUser && 
    (msg.message.toLowerCase().includes('similar cases') || msg.message.toLowerCase().includes('similarity score')) &&
    (msg.message.includes('Case 1') || msg.message.includes('Case 2'));

  if (isSimilarCases) {
    const data = parseSimilarCases(msg.message);
    const cardBorderColor = '#e5e7eb';
    const headerGradient = 'linear-gradient(135deg, #b45309 0%, #d97706 100%)';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2.5,
          width: '100%'
        }}
      >
        <Card
          sx={{
            width: '100%',
            bgcolor: '#ffffff',
            maxWidth: '85%',
            border: `1px solid ${cardBorderColor}`,
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 3,
              background: headerGradient,
              color: '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#fef3c7' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                AI Similar Case Recommendations
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {renderSimilarCasesCard(data)}
          </CardContent>
        </Card>
      </Box>
    );
  }

  const isInvestigationLeads = !isUser && 
    (msg.message.toLowerCase().includes('investigation leads') || msg.message.toLowerCase().includes('investigation lead')) &&
    (msg.message.includes('Lead 1') || msg.message.includes('Lead 2'));

  if (isInvestigationLeads) {
    const data = parseInvestigationLeads(msg.message);
    const cardBorderColor = '#ddd6fe';
    const headerGradient = 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2.5,
          width: '100%'
        }}
      >
        <Card
          sx={{
            width: '100%',
            bgcolor: '#ffffff',
            maxWidth: '85%',
            border: `1px solid ${cardBorderColor}`,
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 3,
              background: headerGradient,
              color: '#FFFFFF'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#fef3c7' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                AI Investigation Lead Recommendations
              </Typography>
            </Box>
          </Box>

          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {renderInvestigationLeadsCard(data)}
          </CardContent>
        </Card>
      </Box>
    );
  }

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
          gutterBottom
          sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          {isUser ? 'User' : 'Assistant'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {msg.message}
        </Typography>
        {!isUser && msg.isVoice && audioCacheRef && (
          <VoicePlayer
            messageId={msg.messageId}
            text={msg.message}
            originalPrompt={originalPrompt || ''}
            audioCacheRef={audioCacheRef}
            audioBase64={msg.audio}
          />
        )}
        {msg.timestamp && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: '0.7rem', display: 'block', textAlign: 'right', mt: 0.5 }}
          >
            {formatTime(msg.timestamp)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ChatBubble;
