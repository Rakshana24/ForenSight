import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Grid } from '@mui/material';
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

interface ChatBubbleProps {
  msg: Message;
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
