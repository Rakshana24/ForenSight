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
  Skeleton,
  Fade,
  Grow
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  PieChart as ChartIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { intelligenceService } from '../../services/intelligenceService';

interface FilterOptions {
  districts: Array<{ ROWID: string; DistrictID: string; DistrictName: string }>;
  stations: Array<{ ROWID: string; UnitID: string; UnitName: string; DistrictID: string }>;
  crimeTypes: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
}

interface DemographicsTabProps {
  filterOpts: FilterOptions | null;
}

// Enterprise Purple Palette
const THEME = {
  primary: '#09084eff',
  dark: '#09013bff',
  light: '#261b85ff',
  lavender: '#E0E7FF',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textSecondary: '#475569'
};

const CHART_COLORS = ['#09084e', '#261b85', '#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const PremiumCardStyle = {
  borderRadius: '16px',
  height: '100%',
  minHeight: 500,
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
  boxShadow: '0 4px 14px rgba(109, 40, 217, 0.04), 0 2px 6px rgba(109, 40, 217, 0.02)',
  border: `1px solid ${THEME.border}`,
  backgroundColor: '#ffffff',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 24px rgba(109, 40, 217, 0.08), 0 4px 8px rgba(109, 40, 217, 0.04)'
  }
};

const InputStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s',
    '&:hover fieldset': {
      borderColor: THEME.light,
    },
    '&.Mui-focused fieldset': {
      borderColor: THEME.primary,
      borderWidth: '2px'
    }
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: THEME.primary
  }
};

const DemographicsTab: React.FC<DemographicsTabProps> = ({ filterOpts }) => {
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedCrimeType, setSelectedCrimeType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDemographicData();
  }, []);

  const fetchDemographicData = async () => {
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
      const result = await intelligenceService.getDemographicData(filters);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch demographic data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDemographicData();
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
      fetchDemographicData();
    }, 50);
  };

  const getFilteredStations = () => {
    if (!filterOpts) return [];
    if (!selectedDistrict) return filterOpts.stations;
    return filterOpts.stations.filter(s => s.DistrictID === selectedDistrict);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: `1px solid ${THEME.border}` }}>
          <Typography sx={{ fontWeight: 600, color: THEME.textMain, mb: 1 }}>{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} sx={{ color: THEME.primary, fontWeight: 500 }}>
              Records: {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const renderBarChart = (dataArr: any[], color: string, xKey: string = 'name', yKey: string = 'count') => (
    <Box sx={{ width: '100%', flexGrow: 1, minHeight: 400, mt: 3, display: 'flex' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dataArr} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke={THEME.textSecondary}
            fontSize={13}
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{ fill: THEME.textSecondary }}
            height={70}
            axisLine={{ stroke: THEME.border }}
            tickLine={false}
          />
          <YAxis
            stroke={THEME.textSecondary}
            fontSize={13}
            tick={{ fill: THEME.textSecondary }}
            width={50}
            axisLine={{ stroke: THEME.border }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(109, 40, 217, 0.04)' }} />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} barSize={45} isAnimationActive={true} animationDuration={1000} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderHorizontalBarChart = (dataArr: any[], color: string, leftMargin: number = 140) => (
    <Box sx={{ width: '100%', height: 400, overflowY: 'auto', overflowX: 'hidden', mt: 3, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' } }}>
      <Box sx={{ width: '100%', height: Math.max(400, (dataArr?.length || 0) * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={dataArr} margin={{ top: 20, right: 30, left: leftMargin, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} horizontal={false} />
            <XAxis
              type="number"
              stroke={THEME.textSecondary}
              fontSize={13}
              tick={{ fill: THEME.textSecondary }}
              axisLine={{ stroke: THEME.border }}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke={THEME.textSecondary}
              fontSize={13}
              width={leftMargin + 10}
              tick={{ fill: THEME.textSecondary }}
              interval={0}
              axisLine={{ stroke: THEME.border }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(109, 40, 217, 0.04)' }} />
            <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} barSize={32} isAnimationActive={true} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );

  const renderPieChart = (dataArr: any[]) => (
    <Box sx={{ width: '100%', flexGrow: 1, minHeight: 400, mt: 2, display: 'flex' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 20, bottom: 50, left: 20 }}>
          <Pie
            data={dataArr}
            cx="50%"
            cy="50%"
            innerRadius={100}
            outerRadius={140}
            paddingAngle={4}
            dataKey="count"
            isAnimationActive={true}
            animationDuration={1000}
            stroke="none"
          >
            {dataArr.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={40}
            iconType="circle"
            wrapperStyle={{ fontSize: '14px', paddingTop: '20px', color: THEME.textSecondary }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderSkeletonCard = () => (
    <Card sx={PremiumCardStyle}>
      <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" width="100%" height={350} sx={{ borderRadius: 2 }} />
      </CardContent>
    </Card>
  );

  return (
    <Fade in={mounted} timeout={600}>
      <Box sx={{ width: '100%', minHeight: '100vh', backgroundColor: THEME.bg, p: { xs: 3, sm: 4, lg: 6 }, boxSizing: 'border-box' }}>

        {/* HEADER */}
        <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: THEME.lavender, color: THEME.dark, display: 'flex' }}>
            <ChartIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: THEME.dark, letterSpacing: '-0.02em' }}>
              Demographic Crime Analysis
            </Typography>
            <Typography variant="body1" sx={{ color: THEME.textSecondary, mt: 0.5, fontWeight: 500 }}>
              Enterprise intelligence dashboard mapping socioeconomic crime trends.
            </Typography>
          </Box>
        </Box>

        {/* PREMIUM FILTER PANEL */}
        <Card sx={{ mb: 6, borderRadius: '20px', boxShadow: '0 8px 30px rgba(109, 40, 217, 0.04)', border: `1px solid ${THEME.border}`, overflow: 'visible' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box component="form" onSubmit={handleApplyFilters}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <FilterIcon sx={{ color: THEME.primary, fontSize: 26 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: THEME.textMain }}>
                  Data Filters
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <FormControl fullWidth sx={InputStyle}>
                    <InputLabel>District</InputLabel>
                    <Select value={selectedDistrict} label="District" onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedStation(''); }}>
                      <MenuItem value=""><em>All Districts</em></MenuItem>
                      {filterOpts?.districts.map(d => (
                        <MenuItem key={d.ROWID} value={d.ROWID}>{d.DistrictName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <FormControl fullWidth sx={InputStyle}>
                    <InputLabel>Police Station</InputLabel>
                    <Select value={selectedStation} label="Police Station" onChange={(e) => setSelectedStation(e.target.value)}>
                      <MenuItem value=""><em>All Stations</em></MenuItem>
                      {getFilteredStations().map(s => (
                        <MenuItem key={s.ROWID} value={s.ROWID}>{s.UnitName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                  <FormControl fullWidth sx={InputStyle}>
                    <InputLabel>Crime Type</InputLabel>
                    <Select value={selectedCrimeType} label="Crime Type" onChange={(e) => setSelectedCrimeType(e.target.value)}>
                      <MenuItem value=""><em>All Types</em></MenuItem>
                      {filterOpts?.crimeTypes.map(c => (
                        <MenuItem key={c.ROWID} value={c.ROWID}>{c.CrimeGroupName}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                  <FormControl fullWidth sx={InputStyle}>
                    <InputLabel>Year</InputLabel>
                    <Select value={selectedYear} label="Year" onChange={(e) => setSelectedYear(e.target.value)}>
                      <MenuItem value=""><em>Any</em></MenuItem>
                      {['2021', '2022', '2023', '2024', '2025'].map(y => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                  <FormControl fullWidth sx={InputStyle}>
                    <InputLabel>Month</InputLabel>
                    <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}>
                      <MenuItem value=""><em>Any</em></MenuItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <MenuItem key={m} value={m.toString()}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={InputStyle}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={InputStyle}
                  />
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'stretch' }}>
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '10px',
                      px: 4,
                      py: 1.5,
                      borderColor: THEME.primary,
                      color: THEME.primary,
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: THEME.lavender,
                        borderColor: THEME.dark
                      }
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    type="submit"
                    startIcon={<SearchIcon />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '10px',
                      px: 4,
                      py: 1.5,
                      backgroundColor: THEME.primary,
                      boxShadow: `0 4px 14px ${THEME.lavender}`,
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: THEME.dark,
                        boxShadow: `0 6px 20px ${THEME.light}`
                      }
                    }}
                  >
                    Apply Filters
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Box>
              <Skeleton variant="text" width={280} height={50} sx={{ mb: 4 }} />
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, lg: 6 }}>{renderSkeletonCard()}</Grid>
                <Grid size={{ xs: 12, lg: 6 }}>{renderSkeletonCard()}</Grid>
              </Grid>
            </Box>
          </Box>
        )}

        {error && !loading && <Alert severity="error" sx={{ mb: 4, borderRadius: 2, py: 2, fontSize: '1.1rem' }}>{error}</Alert>}

        {!loading && !error && data && data.totalRecords === 0 && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2, py: 2, fontSize: '1.1rem', backgroundColor: '#EFF6FF', color: '#1E40AF' }}>No case records found for the selected intelligence filters.</Alert>
        )}

        {!loading && !error && data && data.totalRecords > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* SECTION 1: Accused Demographics */}
            <Grow in={true} timeout={600}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: THEME.textMain, letterSpacing: '-0.02em', borderBottom: `2px solid ${THEME.border}`, pb: 2 }}>
                  Accused Demographics
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Age Distribution</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Categorization of accused individuals across cases.</Typography>
                        {data.accused.age.length > 0 ? renderBarChart(data.accused.age, THEME.primary) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Gender Ratio</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Demographic breakdown of accused individuals by gender.</Typography>
                        {data.accused.gender.length > 0 ? renderPieChart(data.accused.gender) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grow>

            {/* SECTION 2: Victim Demographics */}
            <Grow in={true} timeout={900}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: THEME.textMain, letterSpacing: '-0.02em', borderBottom: `2px solid ${THEME.border}`, pb: 2 }}>
                  Victim Demographics
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Age Distribution</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Categorization of victims across selected cases.</Typography>
                        {data.victim.age.length > 0 ? renderBarChart(data.victim.age, THEME.light) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Gender Ratio</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Demographic breakdown of victims by gender.</Typography>
                        {data.victim.gender.length > 0 ? renderPieChart(data.victim.gender) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grow>

            {/* SECTION 3: Complainant Demographics */}
            <Grow in={true} timeout={1200}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: THEME.textMain, letterSpacing: '-0.02em', borderBottom: `2px solid ${THEME.border}`, pb: 2 }}>
                  Complainant Socio-Economics
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, xl: 12 }}>
                    <Card sx={{ ...PremiumCardStyle, minHeight: 650 }}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Occupation Overview</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Detailed distribution of complainant occupations.</Typography>
                        {data.complainant.occupation.length > 0 ? renderHorizontalBarChart(data.complainant.occupation.slice(0, 15), THEME.primary, 220) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Religious Distribution</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Breakdown of complainants by registered religion.</Typography>
                        {data.complainant.religion.length > 0 ? renderHorizontalBarChart(data.complainant.religion, THEME.dark, 140) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Caste Distribution</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Breakdown of complainants by registered caste.</Typography>
                        {data.complainant.caste.length > 0 ? renderHorizontalBarChart(data.complainant.caste, THEME.light, 140) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grow>

            {/* SECTION 4: Geography */}
            <Grow in={true} timeout={1500}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: THEME.textMain, letterSpacing: '-0.02em', borderBottom: `2px solid ${THEME.border}`, pb: 2 }}>
                  Geographic Heatmap Analysis
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Cases by District</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Macro-regional crime distribution.</Typography>
                        {data.geography.district.length > 0 ? renderHorizontalBarChart(data.geography.district, THEME.primary, 150) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: THEME.textMain }}>Cases by Police Station</Typography>
                        <Typography variant="body1" sx={{ color: THEME.textSecondary, mb: 3 }}>Granular operational unit distribution.</Typography>
                        {data.geography.station.length > 0 ? renderHorizontalBarChart(data.geography.station.slice(0, 15), THEME.dark, 180) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grow>

          </Box>
        )}
      </Box>
    </Fade>
  );
};

export default DemographicsTab;
