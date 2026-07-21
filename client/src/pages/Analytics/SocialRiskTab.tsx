import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/ErrorOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import LocationIcon from '@mui/icons-material/LocationOn';
import PoliceIcon from '@mui/icons-material/LocalPolice';
import WorkIcon from '@mui/icons-material/Work';
import CrimeIcon from '@mui/icons-material/Gavel';
import { intelligenceService } from '../../services/intelligenceService';

interface FilterOptions {
  startDate: string;
  endDate: string;
  district: string;
  policeStation: string;
  crimeType: string;
}

interface SocialRiskTabProps {
  filterOpts: FilterOptions | null;
}

const THEME = {
  primary: '#09084eff',
  dark: '#09013bff',
  light: '#261b85ff',
  lavender: '#E0E7FF',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textSecondary: '#475569',
  insightBg: '#EFF6FF',
  insightText: '#1E40AF'
};

const PremiumCardStyle = {
  borderRadius: '16px',
  height: '100%',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
  border: `1px solid ${THEME.border}`,
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(9, 8, 78, 0.08)'
  }
};

export default function SocialRiskTab({ filterOpts }: SocialRiskTabProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const filters = filterOpts ? { ...filterOpts } : {};
        const riskData = await intelligenceService.getSocialRiskData(filters);
        setData(riskData);
      } catch (err) {
        console.error('Error fetching social risk data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filterOpts]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: THEME.primary }} />
      </Box>
    );
  }

  if (!data) return null;

  const renderRiskBadge = () => {
    let color = THEME.primary;
    let icon = <CheckCircleIcon sx={{ fontSize: 40, color }} />;
    let text = "LOW RISK";

    if (data.riskLevel === 'High') {
      color = '#d32f2f'; // Error red
      icon = <ErrorIcon sx={{ fontSize: 40, color }} />;
      text = "HIGH RISK";
    } else if (data.riskLevel === 'Moderate') {
      color = '#ed6c02'; // Warning orange
      icon = <WarningIcon sx={{ fontSize: 40, color }} />;
      text = "MODERATE RISK";
    }

    return (
      <Card sx={{ ...PremiumCardStyle, borderTop: `4px solid ${color}`, mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
          <Box sx={{ mr: 3 }}>{icon}</Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: THEME.textMain }}>
              Overall Social Risk Assessment
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color, mt: 0.5 }}>
              {text}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: THEME.bg, minHeight: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: THEME.dark, mb: 1 }}>
          Social Risk Analysis
        </Typography>
        <Typography variant="body1" sx={{ color: THEME.textSecondary, maxWidth: 800 }}>
          Deterministic, rule-based evaluation of regional vulnerabilities drawn from demographic
          and socio-economic patterns. Evaluated across {data.totalRecords} total reported cases.
        </Typography>
      </Box>

      {renderRiskBadge()}

      {/* Insights Panel */}
      <Card sx={{ ...PremiumCardStyle, mb: 4, bgcolor: THEME.insightBg, border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: THEME.insightText, mb: 2 }}>
            Critical Risk Observations
          </Typography>
          {data.overallRiskSummary.length > 0 ? (
            <List dense>
              {data.overallRiskSummary.map((summary: string, idx: number) => {
                let isCritical = summary.startsWith('CRITICAL');
                let isWarning = summary.startsWith('ELEVATED') || summary.startsWith('WARNING');
                return (
                  <ListItem key={idx} sx={{ py: 1 }}>
                    <ListItemIcon>
                      {isCritical ? <ErrorIcon color="error" /> : isWarning ? <WarningIcon color="warning" /> : <CheckCircleIcon color="primary" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography sx={{ 
                          fontWeight: isCritical ? 700 : 500,
                          color: isCritical ? '#d32f2f' : THEME.textMain
                        }}>
                          {summary}
                        </Typography>
                      } 
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Alert severity="success">No elevated risk indicators detected in the current data selection.</Alert>
          )}
        </CardContent>
      </Card>

      {/* Risk Factors Grid */}
      <Grid container spacing={3}>
        
        {/* High Risk Districts */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ ...PremiumCardStyle }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationIcon sx={{ color: THEME.primary, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: THEME.dark }}>
                  High-Risk Districts
                </Typography>
              </Box>
              {data.highRiskDistricts.length > 0 ? (
                <List>
                  {data.highRiskDistricts.map((d: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: THEME.textMain }}>{d.name}</Typography>}
                          secondary={`${d.count} cases (${d.percentage}%)`}
                        />
                      </ListItem>
                      {idx < data.highRiskDistricts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No districts exceeded risk thresholds.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* High Workload Units */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ ...PremiumCardStyle }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PoliceIcon sx={{ color: THEME.primary, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: THEME.dark }}>
                  High-Workload Police Units
                </Typography>
              </Box>
              {data.highWorkloadUnits.length > 0 ? (
                <List>
                  {data.highWorkloadUnits.map((u: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: THEME.textMain }}>{u.name}</Typography>}
                          secondary={`${u.count} cases (${u.percentage}%)`}
                        />
                      </ListItem>
                      {idx < data.highWorkloadUnits.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No units have disproportionate workloads.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Occupation Vulnerabilities */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ ...PremiumCardStyle }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <WorkIcon sx={{ color: THEME.primary, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: THEME.dark }}>
                  Occupation Vulnerabilities
                </Typography>
              </Box>
              {data.occupationRiskIndicators.length > 0 ? (
                <List>
                  {data.occupationRiskIndicators.map((o: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: THEME.textMain }}>{o.name}</Typography>} 
                          secondary={`${o.count} victims/complainants (${o.percentage}%)`}
                        />
                      </ListItem>
                      {idx < data.occupationRiskIndicators.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No occupational vulnerabilities detected.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Crime Category Hotspots */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ ...PremiumCardStyle }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CrimeIcon sx={{ color: THEME.primary, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: THEME.dark }}>
                  Crime Category Dominance
                </Typography>
              </Box>
              {data.crimeCategoryHotspots.length > 0 ? (
                <List>
                  {data.crimeCategoryHotspots.map((c: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: THEME.textMain }}>{c.name}</Typography>}
                          secondary={`${c.count} cases (${c.percentage}%)`}
                        />
                      </ListItem>
                      {idx < data.crimeCategoryHotspots.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">Crime categories are evenly distributed.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
