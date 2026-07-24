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
  PieChart as ChartIcon,
  ClearAll as ClearIcon
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

import { useTheme } from '@mui/material/styles';

interface FilterOptions {
  districts: Array<{ ROWID: string; DistrictID: string; DistrictName: string }>;
  stations: Array<{ ROWID: string; UnitID: string; UnitName: string; DistrictID: string }>;
  crimeTypes: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
}

interface DemographicsTabProps {
  filterOpts: FilterOptions | null;
}

const CHART_COLORS = ['#7C3AED', '#5B21B6', '#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

const DemographicsTab: React.FC<DemographicsTabProps> = ({ filterOpts }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.primary.light;
  const darkColor = theme.palette.primary.dark;
  const lavenderColor = isDark ? 'rgba(124, 58, 237, 0.15)' : '#E0E7FF';

  const PremiumCardStyle = {
    borderRadius: '16px',
    height: '100%',
    minHeight: 500,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out, background-color 0.3s ease, border-color 0.3s ease',
    boxShadow: isDark 
      ? '0 4px 20px rgba(0, 0, 0, 0.2)' 
      : '0 4px 14px rgba(109, 40, 217, 0.04), 0 2px 6px rgba(109, 40, 217, 0.02)',
    border: '1px solid',
    borderColor: 'divider',
    backgroundColor: 'background.paper',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: isDark 
        ? '0 12px 28px rgba(0, 0, 0, 0.3)' 
        : '0 12px 24px rgba(109, 40, 217, 0.08), 0 4px 8px rgba(109, 40, 217, 0.04)'
    }
  };

  const InputStyle = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      backgroundColor: 'background.paper',
      transition: 'all 0.2s',
      '&:hover fieldset': {
        borderColor: 'primary.light',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'primary.main',
        borderWidth: '2px'
      }
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'primary.main'
    }
  };

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
        <Box sx={{
          bgcolor: 'background.paper',
          p: 2,
          borderRadius: 2,
          boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} sx={{ color: 'primary.main', fontWeight: 500 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke={theme.palette.text.secondary}
            fontSize={13}
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{ fill: theme.palette.text.secondary }}
            height={70}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={false}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            fontSize={13}
            tick={{ fill: theme.palette.text.secondary }}
            width={50}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(109, 40, 217, 0.04)' }} />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} barSize={45} isAnimationActive={true} animationDuration={1000} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderHorizontalBarChart = (dataArr: any[], color: string, leftMargin: number = 140) => (
    <Box sx={{ width: '100%', height: 400, overflowY: 'auto', overflowX: 'hidden', mt: 3, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: '10px' } }}>
      <Box sx={{ width: '100%', height: Math.max(400, (dataArr?.length || 0) * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={dataArr} margin={{ top: 20, right: 30, left: leftMargin, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
            <XAxis
              type="number"
              stroke={theme.palette.text.secondary}
              fontSize={13}
              tick={{ fill: theme.palette.text.secondary }}
              axisLine={{ stroke: theme.palette.divider }}
              tickLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke={theme.palette.text.secondary}
              fontSize={13}
              width={leftMargin + 10}
              tick={{ fill: theme.palette.text.secondary }}
              interval={0}
              axisLine={{ stroke: theme.palette.divider }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(109, 40, 217, 0.04)' }} />
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
            wrapperStyle={{ fontSize: '14px', paddingTop: '20px', color: theme.palette.text.secondary }}
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
      <Box sx={{ width: '100%', boxSizing: 'border-box' }}>

        {/* Filters Form */}
        <Card sx={{ mb: 3.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
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
                    sx={{ textTransform: 'none' }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    startIcon={<FilterIcon />}
                    size="small"
                    sx={{ textTransform: 'none' }}
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
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2, py: 2, fontSize: '1.1rem' }}>No case records found for the selected intelligence filters.</Alert>
        )}

        {!loading && !error && data && data.totalRecords > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* SECTION 1: Accused Demographics */}
            <Grow in={true} timeout={600}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: 'text.primary', letterSpacing: '-0.02em', borderBottom: '2px solid', borderColor: 'divider', pb: 2 }}>
                  Accused Demographics
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Age Distribution</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Categorization of accused individuals across cases.</Typography>
                        {data.accused.age.length > 0 ? renderBarChart(data.accused.age, primaryColor) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Gender Ratio</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Demographic breakdown of accused individuals by gender.</Typography>
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
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: 'text.primary', letterSpacing: '-0.02em', borderBottom: '2px solid', borderColor: 'divider', pb: 2 }}>
                  Victim Demographics
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Age Distribution</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Categorization of victims across selected cases.</Typography>
                        {data.victim.age.length > 0 ? renderBarChart(data.victim.age, secondaryColor) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Gender Ratio</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Demographic breakdown of victims by gender.</Typography>
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
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: 'text.primary', letterSpacing: '-0.02em', borderBottom: '2px solid', borderColor: 'divider', pb: 2 }}>
                  Complainant Socio-Economics
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, xl: 12 }}>
                    <Card sx={{ ...PremiumCardStyle, minHeight: 650 }}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Occupation Overview</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Detailed distribution of complainant occupations.</Typography>
                        {data.complainant.occupation.length > 0 ? renderHorizontalBarChart(data.complainant.occupation.slice(0, 15), primaryColor, 220) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Religious Distribution</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Breakdown of complainants by registered religion.</Typography>
                        {data.complainant.religion.length > 0 ? renderHorizontalBarChart(data.complainant.religion, darkColor, 140) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Caste Distribution</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Breakdown of complainants by registered caste.</Typography>
                        {data.complainant.caste.length > 0 ? renderHorizontalBarChart(data.complainant.caste, secondaryColor, 140) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grow>

            {/* SECTION 4: Geography */}
            <Grow in={true} timeout={1500}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: 'text.primary', letterSpacing: '-0.02em', borderBottom: '2px solid', borderColor: 'divider', pb: 2 }}>
                  Geographic Heatmap Analysis
                </Typography>
                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Cases by District</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Macro-regional crime distribution.</Typography>
                        {data.geography.district.length > 0 ? renderHorizontalBarChart(data.geography.district, primaryColor, 150) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <Card sx={PremiumCardStyle}>
                      <CardContent sx={{ p: { xs: 3, sm: 4, lg: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Cases by Police Station</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>Granular operational unit distribution.</Typography>
                        {data.geography.station.length > 0 ? renderHorizontalBarChart(data.geography.station.slice(0, 15), darkColor, 180) : <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="body1" color="text.secondary">No data available.</Typography></Box>}
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
