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

import { useTheme } from '@mui/material/styles';

export default function SocialRiskTab({ filterOpts }: SocialRiskTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.primary.light;
  const darkColor = theme.palette.primary.dark;
  const lavenderColor = isDark ? 'rgba(124, 58, 237, 0.15)' : '#E0E7FF';

  const PremiumCardStyle = {
    borderRadius: '16px',
    height: '100%',
    boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.03)',
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.3s ease, border-color 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: isDark ? '0 8px 30px rgba(0, 0, 0, 0.3)' : '0 8px 30px rgba(9, 8, 78, 0.08)'
    }
  };

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
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!data) return null;

  const renderRiskBadge = () => {
    let color = primaryColor;
    let icon = <CheckCircleIcon sx={{ fontSize: 40, color }} />;
    let text = "LOW RISK";

    if (data.riskLevel === 'High') {
      color = theme.palette.error.main;
      icon = <ErrorIcon sx={{ fontSize: 40, color }} />;
      text = "HIGH RISK";
    } else if (data.riskLevel === 'Moderate') {
      color = theme.palette.warning.main;
      icon = <WarningIcon sx={{ fontSize: 40, color }} />;
      text = "MODERATE RISK";
    }

    return (
      <Card sx={{ ...PremiumCardStyle, borderTop: `4px solid ${color}`, mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
          <Box sx={{ mr: 3 }}>{icon}</Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* Subtitle Description */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 800 }}>
          Deterministic, rule-based evaluation of regional vulnerabilities drawn from demographic
          and socio-economic patterns. Evaluated across {data.totalRecords} total reported cases.
        </Typography>
      </Box>

      {renderRiskBadge()}

      {/* Insights Panel */}
      <Card sx={{ ...PremiumCardStyle, mb: 4, bgcolor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#EFF6FF', border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? 'primary.light' : '#1E40AF', mb: 2 }}>
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
                          color: isCritical ? theme.palette.error.main : 'text.primary'
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
                <LocationIcon sx={{ color: primaryColor, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  High-Risk Districts
                </Typography>
              </Box>
              {data.highRiskDistricts.length > 0 ? (
                <List>
                  {data.highRiskDistricts.map((d: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{d.name}</Typography>}
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
                <PoliceIcon sx={{ color: primaryColor, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  High-Workload Police Units
                </Typography>
              </Box>
              {data.highWorkloadUnits.length > 0 ? (
                <List>
                  {data.highWorkloadUnits.map((u: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{u.name}</Typography>}
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
                <WorkIcon sx={{ color: primaryColor, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Occupation Vulnerabilities
                </Typography>
              </Box>
              {data.occupationRiskIndicators.length > 0 ? (
                <List>
                  {data.occupationRiskIndicators.map((o: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{o.name}</Typography>} 
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
                <CrimeIcon sx={{ color: primaryColor, mr: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Crime Category Dominance
                </Typography>
              </Box>
              {data.crimeCategoryHotspots.length > 0 ? (
                <List>
                  {data.crimeCategoryHotspots.map((c: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{c.name}</Typography>}
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
