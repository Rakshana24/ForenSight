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
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Layers as HotspotIcon,
  BubbleChart as ClusterIcon,
  AcUnit as SeasonalIcon,
  ClearAll as ClearIcon,
  LocationOn as PinIcon,
  Map as MapIcon,
  PieChart as PieChartIcon,
  TableChart as TableIcon
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
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { intelligenceService } from '../../services/intelligenceService';

interface FilterOptions {
  districts: Array<{ ROWID: string; DistrictID: string; DistrictName: string }>;
  stations: Array<{ ROWID: string; UnitID: string; UnitName: string; DistrictID: string }>;
  crimeTypes: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
  crimeCategories?: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
  crimeSubHeads?: Array<{ ROWID: string; CrimeSubHeadID: string; CrimeHeadID: string; CrimeHeadName: string }>;
}

const AnalyticsPage: React.FC = () => {
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

  // Hotspot Filters & Analytics States
  const [selectedCrimeCategory, setSelectedCrimeCategory] = useState('');
  const [selectedCrimeSubHead, setSelectedCrimeSubHead] = useState('');
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [hotspotError, setHotspotError] = useState('');
  const [hotspotData, setHotspotData] = useState<any>(null);
  const [hotspotLimit, setHotspotLimit] = useState<number>(10);
  const [hotspotDimension, setHotspotDimension] = useState<string>('stations'); // districts, stations, locations, crimeCategories, crimeTypes
  const [hotspotChartType, setHotspotChartType] = useState<string>('bar'); // bar, horizontal, pie, table, map
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = React.useRef<any>(null);

  // Trend Data States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trendData, setTrendData] = useState<any>(null);
  const [activeTrendType, setActiveTrendType] = useState<'Daily' | 'Monthly' | 'Yearly' | 'Crime-wise'>('Monthly');
  const [activeChartType, setActiveChartType] = useState<'Line' | 'Bar' | 'Area'>('Area');

  // Colors for visualization
  const COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];

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

  // Load Hotspot Data
  const fetchHotspotData = async () => {
    setHotspotLoading(true);
    setHotspotError('');
    try {
      const filters = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        crimeCategory: selectedCrimeCategory || undefined,
        crimeType: selectedCrimeSubHead || undefined,
        district: selectedDistrict || undefined,
        policeStation: selectedStation || undefined,
        year: selectedYear || undefined,
        month: selectedMonth || undefined
      };
      const data = await intelligenceService.getHotspotData(filters);
      setHotspotData(data);
    } catch (err: any) {
      setHotspotError(err.response?.data?.message || 'Failed to fetch crime hotspot data.');
    } finally {
      setHotspotLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchTrendData();
    } else if (activeTab === 1) {
      fetchHotspotData();
    }
  }, [activeTab]);

  // Load Leaflet Script & CSS
  useEffect(() => {
    if (activeTab === 1) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          setLeafletReady(true);
        };
        document.body.appendChild(script);
      } else {
        setLeafletReady(true);
      }
    }
  }, [activeTab]);

  // Initialize and Render Leaflet Map
  useEffect(() => {
    if (activeTab === 1 && leafletReady && hotspotData?.rankings?.locations && hotspotChartType === 'map') {
      const timer = setTimeout(() => {
        const container = document.getElementById('hotspot-map');
        if (!container) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const locations = hotspotData.rankings.locations;
        const validCoords = locations.filter((l: any) => l.lat && l.lng);
        if (validCoords.length === 0) {
          return;
        }

        const centerLat = validCoords[0].lat;
        const centerLng = validCoords[0].lng;

        const map = (window as any).L.map('hotspot-map').setView([centerLat, centerLng], 10);
        (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        validCoords.forEach((loc: any) => {
          const marker = (window as any).L.marker([loc.lat, loc.lng]).addTo(map);
          marker.bindPopup(`
            <div style="font-family: Inter, sans-serif; font-size: 13px;">
              <strong style="color: #1E3A8A; font-size: 14px;">${loc.name}</strong><br/>
              <hr style="margin: 6px 0; border: none; border-top: 1px solid #E5E7EB;"/>
              <b>Crimes:</b> ${loc.count}<br/>
              <b>Percentage:</b> ${loc.percentage}%<br/>
              <b>Trend:</b> <span style="color: ${loc.trend.startsWith('+') ? '#DC2626' : loc.trend.startsWith('-') ? '#16A34A' : '#4B5563'}; font-weight: bold;">${loc.trend}</span><br/>
              <b>Density:</b> <span style="font-weight: bold; color: ${loc.density === 'High' ? '#DC2626' : loc.density === 'Medium' ? '#D97706' : '#2563EB'};">${loc.density}</span>
            </div>
          `);
        });

        mapRef.current = map;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeTab, leafletReady, hotspotData, hotspotChartType]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
    setTimeout(() => {
      fetchTrendData();
    }, 50);
  };

  const handleApplyHotspotFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHotspotData();
  };

  const handleClearHotspotFilters = () => {
    setSelectedDistrict('');
    setSelectedStation('');
    setSelectedCrimeCategory('');
    setSelectedCrimeSubHead('');
    setStartDate('');
    setEndDate('');
    setSelectedYear('');
    setSelectedMonth('');
    setTimeout(() => {
      fetchHotspotData();
    }, 50);
  };

  // Get filtered stations based on selected district
  const getFilteredStations = () => {
    if (!filterOpts) return [];
    if (!selectedDistrict) return filterOpts.stations;
    return filterOpts.stations.filter(s => s.DistrictID === selectedDistrict);
  };

  // Get filtered crime subheads based on selected crime category
  const getFilteredSubHeads = () => {
    if (!filterOpts || !filterOpts.crimeSubHeads) return [];
    if (!selectedCrimeCategory) return filterOpts.crimeSubHeads;
    const category = filterOpts.crimeCategories?.find(c => c.ROWID === selectedCrimeCategory);
    if (!category) return filterOpts.crimeSubHeads;
    return filterOpts.crimeSubHeads.filter(s => s.CrimeHeadID === category.ROWID);
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.6 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.6 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.8 }}>
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

      {/* Hotspots Detection Feature */}
      {activeTab === 1 && (
        <>
          {/* Filters Form */}
          <Card sx={{ mb: 3, boxShadow: 'none', border: '1px solid #E5E7EB' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box component="form" onSubmit={handleApplyHotspotFilters}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FilterIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Optional Filters
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>District</InputLabel>
                      <Select
                        value={selectedDistrict}
                        label="District"
                        onChange={(e) => {
                          setSelectedDistrict(e.target.value);
                          setSelectedStation('');
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Crime Category</InputLabel>
                      <Select
                        value={selectedCrimeCategory}
                        label="Crime Category"
                        onChange={(e) => {
                          setSelectedCrimeCategory(e.target.value);
                          setSelectedCrimeSubHead('');
                        }}
                      >
                        <MenuItem value="">
                          <em>None (All Categories)</em>
                        </MenuItem>
                        {filterOpts?.crimeCategories?.map(c => (
                          <MenuItem key={c.ROWID} value={c.ROWID}>
                            {c.CrimeGroupName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Crime Type</InputLabel>
                      <Select
                        value={selectedCrimeSubHead}
                        label="Crime Type"
                        onChange={(e) => setSelectedCrimeSubHead(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None (All Types)</em>
                        </MenuItem>
                        {getFilteredSubHeads().map(s => (
                          <MenuItem key={s.ROWID} value={s.ROWID}>
                            {s.CrimeHeadName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                  <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<ClearIcon />}
                      onClick={handleClearHotspotFilters}
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

          {hotspotLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={40} sx={{ mr: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Analyzing database hotspots...
              </Typography>
            </Box>
          )}

          {hotspotError && !hotspotLoading && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {hotspotError}
            </Alert>
          )}

          {!hotspotLoading && !hotspotError && hotspotData && hotspotData.totalRecords === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No hotspot data available.
            </Alert>
          )}

          {!hotspotLoading && !hotspotError && hotspotData && hotspotData.totalRecords > 0 && (
            <>
              {/* Stats Summaries panels */}
              <Grid container spacing={2} sx={{ mb: 3.5 }}>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 1.6 }}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        TOTAL CRIMES
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                        {hotspotData.summary.totalCrimes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 1.6 }}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        TOTAL HOTSPOTS
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                        {hotspotData.summary.totalHotspots}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.2 }}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        HIGHEST CRIME DISTRICT
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.8, wordBreak: 'break-all' }}>
                        {hotspotData.summary.highestDistrict}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.2 }}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        HIGHEST CRIME STATION
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                        {hotspotData.summary.highestStation}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.2 }}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        HIGHEST CRIME LOCATION
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                        {hotspotData.summary.highestLocation}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.2 }}>
                  <Card sx={{ bgcolor: '#ffffff', minHeight: 90 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                        MOST COMMON CRIME TYPE
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5, lineHeight: 1.2 }}>
                        {hotspotData.summary.mostCommonCrimeType}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Controls Card */}
              <Card sx={{ mb: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          Analyze By:
                        </Typography>
                        <ToggleButtonGroup
                          size="small"
                          value={hotspotDimension}
                          exclusive
                          onChange={(_, val) => val && setHotspotDimension(val)}
                          color="primary"
                        >
                          <ToggleButton value="districts" sx={{ fontWeight: 'bold' }}>District</ToggleButton>
                          <ToggleButton value="stations" sx={{ fontWeight: 'bold' }}>Station</ToggleButton>
                          <ToggleButton value="locations" sx={{ fontWeight: 'bold' }}>Coordinates</ToggleButton>
                          <ToggleButton value="crimeCategories" sx={{ fontWeight: 'bold' }}>Category</ToggleButton>
                          <ToggleButton value="crimeTypes" sx={{ fontWeight: 'bold' }}>Type</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: { xs: 'flex-start', md: 'center' } }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          Show:
                        </Typography>
                        <ToggleButtonGroup
                          size="small"
                          value={hotspotChartType}
                          exclusive
                          onChange={(_, val) => val && setHotspotChartType(val)}
                          color="primary"
                        >
                          <ToggleButton value="bar" title="Bar Chart"><BarChartIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="horizontal" title="Horizontal Ranking Chart"><PinIcon fontSize="small" style={{ transform: 'rotate(90deg)' }} /></ToggleButton>
                          <ToggleButton value="pie" title="Pie Chart"><PieChartIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="table" title="Table View"><TableIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="map" title="Map View"><MapIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          Limit:
                        </Typography>
                        <ToggleButtonGroup
                          size="small"
                          value={hotspotLimit}
                          exclusive
                          onChange={(_, val) => val && setHotspotLimit(val)}
                          color="primary"
                        >
                          <ToggleButton value={5} sx={{ fontWeight: 'bold' }}>Top 5</ToggleButton>
                          <ToggleButton value={10} sx={{ fontWeight: 'bold' }}>Top 10</ToggleButton>
                          <ToggleButton value={20} sx={{ fontWeight: 'bold' }}>Top 20</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Main Panel Content */}
              <Card sx={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  {(() => {
                    const rankedList = hotspotData.rankings[hotspotDimension] || [];
                    const displayData = rankedList.slice(0, hotspotLimit);
                    const hasCoords = hotspotData.rankings.locations.some((l: any) => l.lat && l.lng);
                    const showMapFallback = hotspotChartType === 'map' && (hotspotDimension !== 'locations' || !hasCoords);

                    if (showMapFallback) {
                      const fallbackReason = hotspotDimension !== 'locations'
                        ? 'Geographic coordinate markers are only available under "Coordinates" analysis.'
                        : 'No geographic coordinate data exists in the records for the selected filters.';
                      
                      return (
                        <Box>
                          <Alert severity="warning" sx={{ mb: 3 }}>
                            {fallbackReason} Automatically falling back to Station Table View.
                          </Alert>
                          <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Police Station</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Crime Count</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Percentage</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Density</TableCell>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Trend</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(hotspotData.rankings.stations || []).slice(0, hotspotLimit).map((item: any) => (
                                  <TableRow key={item.rank} hover>
                                    <TableCell>{item.rank}</TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.count}</TableCell>
                                    <TableCell align="right">{item.percentage}%</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={item.density}
                                        size="small"
                                        sx={{
                                          fontWeight: 'bold',
                                          bgcolor: item.density === 'High' ? '#FEE2E2' : item.density === 'Medium' ? '#FEF3C7' : '#DBEAFE',
                                          color: item.density === 'High' ? '#991B1B' : item.density === 'Medium' ? '#92400E' : '#1E40AF'
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell sx={{
                                      fontWeight: 'bold',
                                      color: item.trend.startsWith('+') ? '#DC2626' : item.trend.startsWith('-') ? '#16A34A' : '#4B5563'
                                    }}>
                                      {item.trend}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      );
                    }

                    if (hotspotChartType === 'map') {
                      return (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                            Interactive Crime Hotspots Map (Top {displayData.length} Locations)
                          </Typography>
                          <div
                            id="hotspot-map"
                            style={{
                              width: '100%',
                              height: '400px',
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB',
                              zIndex: 1
                            }}
                          />
                        </Box>
                      );
                    }

                    if (hotspotChartType === 'table') {
                      return (
                        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                  {hotspotDimension === 'districts' ? 'District' :
                                   hotspotDimension === 'stations' ? 'Police Station' :
                                   hotspotDimension === 'locations' ? 'Coordinates / Station' :
                                   hotspotDimension === 'crimeCategories' ? 'Crime Category' : 'Crime Type'}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Crime Count</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Percentage</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Density</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Trend</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {displayData.map((item: any) => (
                                <TableRow key={item.rank} hover>
                                  <TableCell>{item.rank}</TableCell>
                                  <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.count}</TableCell>
                                  <TableCell align="right">{item.percentage}%</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={item.density}
                                      size="small"
                                      sx={{
                                        fontWeight: 'bold',
                                        bgcolor: item.density === 'High' ? '#FEE2E2' : item.density === 'Medium' ? '#FEF3C7' : '#DBEAFE',
                                        color: item.density === 'High' ? '#991B1B' : item.density === 'Medium' ? '#92400E' : '#1E40AF'
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{
                                    fontWeight: 'bold',
                                    color: item.trend.startsWith('+') ? '#DC2626' : item.trend.startsWith('-') ? '#16A34A' : '#4B5563'
                                  }}>
                                    {item.trend}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    }

                    if (hotspotChartType === 'pie') {
                      return (
                        <Box sx={{ width: '100%', height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={displayData}
                                dataKey="count"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                fill="#1E3A8A"
                                label={(props: any) => `${(props.name || '').substring(0, 15)}: ${props.percentage}%`}
                              >
                                {displayData.map((_: any, idx: number) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      );
                    }

                    if (hotspotChartType === 'horizontal') {
                      return (
                        <Box sx={{ width: '100%', height: Math.max(300, displayData.length * 35) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={displayData} margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                              <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                              <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={120} tickFormatter={(val) => val.substring(0, 20)} />
                              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                              <Bar dataKey="count" name="Crime Count" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      );
                    }

                    // Default: Vertical Bar Chart
                    return (
                      <Box sx={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={displayData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} angle={-45} textAnchor="end" height={80} tickFormatter={(val) => val.substring(0, 20)} />
                            <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                            <Bar dataKey="count" name="Crime Count" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          )}
        </>
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
