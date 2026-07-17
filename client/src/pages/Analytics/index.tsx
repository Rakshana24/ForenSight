import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Layers as HotspotIcon,
  BubbleChart as ClusterIcon,
  AcUnit as SeasonalIcon,
  ClearAll as ClearIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { intelligenceService } from '../../services/intelligenceService';

interface FilterOptions {
  districts: Array<{ ROWID: string; DistrictID: string; DistrictName: string }>;
  stations: Array<{ ROWID: string; UnitID: string; UnitName: string; DistrictID: string }>;
  crimeTypes: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
}

const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Filters State
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedCrimeType, setSelectedCrimeType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Trend Data States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trendData, setTrendData] = useState<any>(null);
  const [activeTrendType, setActiveTrendType] = useState<'Daily' | 'Monthly' | 'Yearly' | 'Crime-wise'>('Monthly');
  const [activeChartType, setActiveChartType] = useState<'Line' | 'Bar' | 'Area'>('Area');

  // Load Filters on Mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metadata = await intelligenceService.getFilterOptions();
        setFilterOpts(metadata);
      } catch (err: any) {
        console.error('Failed to load filter metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Load Trend Data
  const fetchTrendData = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        crimeType: selectedCrimeType || undefined,
        district: selectedDistrict || undefined,
        policeStation: selectedStation || undefined,
        year: selectedYear || undefined,
        month: selectedMonth || undefined
      };
      const data = await intelligenceService.getTrendData(filters);
      setTrendData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch crime trend data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchTrendData();
    }
  }, [activeTab]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrendData();
  };

  const handleClearFilters = () => {
    setSelectedDistrict('');
    setSelectedStation('');
    setSelectedCrimeType('');
    setStartDate('');
    setEndDate('');
    setSelectedYear('');
    setSelectedMonth('');
    // Trigger immediate reload with cleared filters
    setTimeout(() => {
      fetchTrendData();
    }, 50);
  };

  // Get filtered stations based on selected district
  const getFilteredStations = () => {
    if (!filterOpts) return [];
    if (!selectedDistrict) return filterOpts.stations;
    return filterOpts.stations.filter(s => s.DistrictID === selectedDistrict);
  };

  // Format Recharts Data
  const getChartData = () => {
    if (!trendData || !trendData.trends || !trendData.trends[activeTrendType]) {
      return [];
    }
    const currentTrend = trendData.trends[activeTrendType];
    return currentTrend.labels.map((label: string, index: number) => ({
      name: label,
      Crimes: currentTrend.values[index]
    }));
  };

  // Compute average crimes based on active trend type
  const getAverageCrimes = () => {
    if (!trendData || !trendData.trends || !trendData.trends[activeTrendType]) {
      return '0';
    }
    const currentTrend = trendData.trends[activeTrendType];
    if (currentTrend.values.length === 0) return '0';
    const sum = currentTrend.values.reduce((acc: number, val: number) => acc + val, 0);
    return (sum / currentTrend.values.length).toFixed(1);
  };

  const chartData = getChartData();
  const averageCrimesValue = getAverageCrimes();

  // Coming Soon Placeholders render
  const renderPlaceholder = (title: string, icon: React.ReactNode, description: string) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        bgcolor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        p: 4,
        textAlign: 'center',
        mt: 2
      }}
    >
      <Box sx={{ p: 2, borderRadius: '50%', bgcolor: '#eff6ff', color: 'primary.main', mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '450px', mb: 3 }}>
        {description}
      </Typography>
      <Chip label="Coming Soon" color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
    </Box>
  );

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
      {/* Page Title & Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Crime Intelligence & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analyze crime trends, patterns, and historical statistics from real police records.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchTrendData}
          disabled={loading}
          size="small"
        >
          Refresh Data
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', boxShadow: 'none' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Crime Trends" icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Hotspots" icon={<HotspotIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Crime Clusters" icon={<ClusterIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Seasonal Analysis" icon={<SeasonalIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Loading Overlay */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
          <CircularProgress size={40} sx={{ mr: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Analyzing database records...
          </Typography>
        </Box>
      )}

      {/* Errors */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tab 0 Content: Crime Trends */}
      {activeTab === 0 && !loading && (
        <>
          {/* Filters Form */}
          <Card sx={{ mb: 3, boxShadow: 'none', border: '1px solid #E5E7EB' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box component="form" onSubmit={handleApplyFilters}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FilterIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Optional Filters
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>District</InputLabel>
                      <Select
                        value={selectedDistrict}
                        label="District"
                        onChange={(e) => {
                          setSelectedDistrict(e.target.value);
                          setSelectedStation(''); // Clear station selection when district changes
                        }}
                      >
                        <MenuItem value="">
                          <em>None (All Districts)</em>
                        </MenuItem>
                        {filterOpts?.districts.map(d => (
                          <MenuItem key={d.ROWID} value={d.ROWID}>
                            {d.DistrictName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Police Station</InputLabel>
                      <Select
                        value={selectedStation}
                        label="Police Station"
                        onChange={(e) => setSelectedStation(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None (All Stations)</em>
                        </MenuItem>
                        {getFilteredStations().map(s => (
                          <MenuItem key={s.ROWID} value={s.ROWID}>
                            {s.UnitName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Crime Type</InputLabel>
                      <Select
                        value={selectedCrimeType}
                        label="Crime Type"
                        onChange={(e) => setSelectedCrimeType(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None (All Types)</em>
                        </MenuItem>
                        {filterOpts?.crimeTypes.map(c => (
                          <MenuItem key={c.ROWID} value={c.ROWID}>
                            {c.CrimeGroupName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={1.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={selectedYear}
                        label="Year"
                        onChange={(e) => setSelectedYear(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {['2021', '2022', '2023', '2024', '2025'].map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={1.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Month</InputLabel>
                      <Select
                        value={selectedMonth}
                        label="Month"
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {[
                          { val: '1', label: 'Jan' },
                          { val: '2', label: 'Feb' },
                          { val: '3', label: 'Mar' },
                          { val: '4', label: 'Apr' },
                          { val: '5', label: 'May' },
                          { val: '6', label: 'Jun' },
                          { val: '7', label: 'Jul' },
                          { val: '8', label: 'Aug' },
                          { val: '9', label: 'Sep' },
                          { val: '10', label: 'Oct' },
                          { val: '11', label: 'Nov' },
                          { val: '12', label: 'Dec' }
                        ].map(m => (
                          <MenuItem key={m.val} value={m.val}>{m.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Date Picker Range */}
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>

                  {/* Form Actions */}
                  <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<ClearIcon />}
                      onClick={handleClearFilters}
                      size="small"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      startIcon={<FilterIcon />}
                      size="small"
                    >
                      Apply Filters
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>

          {/* Stats Summaries panels */}
          {trendData && trendData.totalRecords > 0 ? (
            <>
              <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        TOTAL CRIMES
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                        {trendData.stats.totalCrimes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        AVG CRIMES
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                        {averageCrimesValue}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.6}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        PEAK MONTH
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.8, wordBreak: 'break-all' }}>
                        {trendData.stats.highestMonth}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.6}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        PEAK DAY
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                        {trendData.stats.highestDay}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.8}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        TOP CRIME CATEGORY
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5, lineHeight: 1.2 }}>
                        {trendData.stats.mostFrequentType}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Chart Panel */}
              <Card sx={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Selectors */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        Trend Type:
                      </Typography>
                      <ToggleButtonGroup
                        size="small"
                        value={activeTrendType}
                        exclusive
                        onChange={(_, val) => val && setActiveTrendType(val)}
                        color="primary"
                      >
                        <ToggleButton value="Daily" sx={{ fontWeight: 'bold' }}>Daily</ToggleButton>
                        <ToggleButton value="Monthly" sx={{ fontWeight: 'bold' }}>Monthly</ToggleButton>
                        <ToggleButton value="Yearly" sx={{ fontWeight: 'bold' }}>Yearly</ToggleButton>
                        <ToggleButton value="Crime-wise" sx={{ fontWeight: 'bold' }}>Crime-wise</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        Chart Type:
                      </Typography>
                      <ToggleButtonGroup
                        size="small"
                        value={activeChartType}
                        exclusive
                        onChange={(_, val) => val && setActiveChartType(val)}
                      >
                        <ToggleButton value="Line" title="Line Chart">
                          <LineChartIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="Bar" title="Bar Chart">
                          <BarChartIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="Area" title="Area Chart">
                          <TimelineIcon fontSize="small" />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Box>

                  {/* Chart Rendering */}
                  <Box sx={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {activeChartType === 'Line' ? (
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                          <Legend />
                          <Line type="monotone" dataKey="Crimes" stroke="#1E3A8A" strokeWidth={3} activeDot={{ r: 8 }} />
                        </LineChart>
                      ) : activeChartType === 'Bar' ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                          <Legend />
                          <Bar dataKey="Crimes" fill="#1E3A8A" radius={[4, 4, 0, 0]} barSize={activeTrendType === 'Daily' ? 8 : 32} />
                        </BarChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="crimeColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                          <Legend />
                          <Area type="monotone" dataKey="Crimes" stroke="#1E3A8A" fillOpacity={1} fill="url(#crimeColor)" strokeWidth={2} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No crime records found. Try clearing filters or adjusting your date range.
            </Alert>
          )}
        </>
      )}

      {/* Placeholders for Future Features */}
      {activeTab === 1 && renderPlaceholder(
        'Crime Hotspots Mapping',
        <HotspotIcon sx={{ fontSize: 40 }} />,
        'Our GIS mapping module allows investigators to visual overlay clusters, high-risk coordinates, and density distributions geographically. Coming in the next stabilization cycle.'
      )}
      {activeTab === 2 && renderPlaceholder(
        'Crime Clusters & Associations',
        <ClusterIcon sx={{ fontSize: 40 }} />,
        'Apply advanced AI models to identify cross-boundary crime rings, MO associations, and suspect group behaviors. Coming in the next stabilization cycle.'
      )}
      {activeTab === 3 && renderPlaceholder(
        'Seasonal Analysis & Forecasting',
        <SeasonalIcon sx={{ fontSize: 40 }} />,
        'Identify cyclical crime escalations based on holidays, seasons, weather changes, and local events to optimize policing resources. Coming in the next stabilization cycle.'
      )}
    </Box>
  );
};

export default AnalyticsPage;
