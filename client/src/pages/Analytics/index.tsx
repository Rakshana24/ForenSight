import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TimelineIcon from '@mui/icons-material/Timeline';
import BarChartIcon from '@mui/icons-material/BarChart';
import LineChartIcon from '@mui/icons-material/ShowChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterIcon from '@mui/icons-material/FilterList';
import HotspotIcon from '@mui/icons-material/Layers';
import ClusterIcon from '@mui/icons-material/BubbleChart';
import SeasonalIcon from '@mui/icons-material/AcUnit';
import ClearIcon from '@mui/icons-material/ClearAll';
import PinIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import PieChartIcon from '@mui/icons-material/PieChart';
import TableIcon from '@mui/icons-material/TableChart';
import SocioIcon from '@mui/icons-material/Public';
import RiskIcon from '@mui/icons-material/WarningAmber';
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
import DemographicsTab from './DemographicsTab';
import SocioEconomicTab from './SocioEconomicTab';
import SocialRiskTab from './SocialRiskTab';

interface FilterOptions {
  districts: Array<{ ROWID: string; DistrictID: string; DistrictName: string }>;
  stations: Array<{ ROWID: string; UnitID: string; UnitName: string; DistrictID: string }>;
  crimeTypes: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
  crimeCategories?: Array<{ ROWID: string; CrimeHeadID: string; CrimeGroupName: string }>;
  crimeSubHeads?: Array<{ ROWID: string; CrimeSubHeadID: string; CrimeHeadID: string; CrimeHeadName: string }>;
}

const AnalyticsPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam !== null) {
      const val = parseInt(tabParam, 10);
      if (!isNaN(val) && val >= 0 && val <= 6) {
        return val;
      }
    }
    const state = location.state as { activeTab?: number } | null;
    if (state && typeof state.activeTab === 'number') {
      return state.activeTab;
    }
    return 0;
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam !== null) {
      const val = parseInt(tabParam, 10);
      if (!isNaN(val) && val >= 0 && val <= 6) {
        setActiveTab(val);
      }
    } else {
      const state = location.state as { activeTab?: number } | null;
      if (state && typeof state.activeTab === 'number') {
        setActiveTab(state.activeTab);
      }
    }
  }, [location]);

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

  // Cluster Filters & Analytics States
  const [clusterDistrict, setClusterDistrict] = useState('');
  const [clusterStation, setClusterStation] = useState('');
  const [clusterCrimeCategory, setClusterCrimeCategory] = useState('');
  const [clusterCrimeType, setClusterCrimeType] = useState('');
  const [clusterStartDate, setClusterStartDate] = useState('');
  const [clusterEndDate, setClusterEndDate] = useState('');
  const [clusterYear, setClusterYear] = useState<number | string>('');
  const [clusterMonth, setClusterMonth] = useState<number | string>('');
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterError, setClusterError] = useState('');
  const [clusterData, setClusterData] = useState<any>(null);
  const [clusterInterval, setClusterInterval] = useState('month'); // month, year, quarter, week
  const [clusterDimension, setClusterDimension] = useState('stations'); // districts, stations, locations, crimeCategories, crimeTypes
  const [clusterChartType, setClusterChartType] = useState('bar'); // bar, horizontal, line, table, map
  const [clusterLimit, setClusterLimit] = useState<number>(10);
  const clusterMapRef = React.useRef<any>(null);

  // Seasonal Filters & Analytics States
  const [seasonDistrict, setSeasonDistrict] = useState('');
  const [seasonStation, setSeasonStation] = useState('');
  const [seasonCrimeCategory, setSeasonCrimeCategory] = useState('');
  const [seasonCrimeType, setSeasonCrimeType] = useState('');
  const [seasonStartDate, setSeasonStartDate] = useState('');
  const [seasonEndDate, setSeasonEndDate] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [seasonMonth, setSeasonMonth] = useState('');
  const [seasonSeason, setSeasonSeason] = useState('');
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [seasonalError, setSeasonalError] = useState('');
  const [seasonalData, setSeasonalData] = useState<any>(null);
  const [seasonActiveDimension, setSeasonActiveDimension] = useState<string>('monthly'); // monthly, quarterly, seasonal, weekdayWeekend, dayOfWeek, yearWiseSeasonal, crimeTypeSeason, districtSeason, stationSeason
  const [seasonChartType, setSeasonChartType] = useState<string>('bar'); // bar, line, area, pie, heatmap

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

  // Load Cluster Data
  const fetchClusterData = async () => {
    setClusterLoading(true);
    setClusterError('');
    try {
      const filters = {
        interval: clusterInterval,
        district: clusterDistrict || undefined,
        policeStation: clusterStation || undefined,
        crimeCategory: clusterCrimeCategory || undefined,
        crimeType: clusterCrimeType || undefined,
        startDate: clusterStartDate || undefined,
        endDate: clusterEndDate || undefined,
        year: clusterYear || undefined,
        month: clusterMonth || undefined
      };
      const data = await intelligenceService.getClusterData(filters);
      setClusterData(data);
    } catch (err: any) {
      setClusterError(err.response?.data?.message || 'Failed to fetch crime cluster data.');
    } finally {
      setClusterLoading(false);
    }
  };

  // Load Seasonal Data
  const fetchSeasonalData = async () => {
    setSeasonalLoading(true);
    setSeasonalError('');
    try {
      const filters = {
        district: seasonDistrict || undefined,
        policeStation: seasonStation || undefined,
        crimeCategory: seasonCrimeCategory || undefined,
        crimeType: seasonCrimeType || undefined,
        startDate: seasonStartDate || undefined,
        endDate: seasonEndDate || undefined,
        year: seasonYear || undefined,
        month: seasonMonth || undefined,
        season: seasonSeason || undefined
      };
      const data = await intelligenceService.getSeasonalData(filters);
      setSeasonalData(data);
    } catch (err: any) {
      setSeasonalError(err.response?.data?.message || 'Failed to fetch seasonal crime analysis data.');
    } finally {
      setSeasonalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchTrendData();
    } else if (activeTab === 1) {
      fetchHotspotData();
    } else if (activeTab === 2) {
      fetchClusterData();
    } else if (activeTab === 3) {
      fetchSeasonalData();
    }
  }, [activeTab, clusterInterval]);

  // Load Leaflet Script & CSS
  useEffect(() => {
    if (activeTab === 1 || activeTab === 2) {
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

  // Initialize and Render Leaflet Map for Clusters
  useEffect(() => {
    if (activeTab === 2 && leafletReady && clusterData?.rankings?.locations && clusterChartType === 'map') {
      const timer = setTimeout(() => {
        const container = document.getElementById('cluster-map');
        if (!container) return;

        if (clusterMapRef.current) {
          clusterMapRef.current.remove();
          clusterMapRef.current = null;
        }

        const locations = clusterData.rankings.locations;
        const validCoords = locations.filter((l: any) => l.lat && l.lng);
        if (validCoords.length === 0) {
          return;
        }

        const centerLat = validCoords[0].lat;
        const centerLng = validCoords[0].lng;

        const map = (window as any).L.map('cluster-map').setView([centerLat, centerLng], 10);
        (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        validCoords.forEach((loc: any) => {
          const marker = (window as any).L.marker([loc.lat, loc.lng]).addTo(map);
          marker.bindPopup(`
            <div style="font-family: Inter, sans-serif; font-size: 13px;">
              <strong style="color: #1E3A8A; font-size: 14px;">${loc.name}</strong><br/>
              <hr style="margin: 6px 0; border: none; border-top: 1px solid #E5E7EB;"/>
              <b>Current Count:</b> ${loc.currentCount}<br/>
              <b>Previous Count:</b> ${loc.previousCount}<br/>
              <b>Growth:</b> <span style="color: ${loc.difference > 0 ? '#DC2626' : loc.difference < 0 ? '#16A34A' : '#4B5563'}; font-weight: bold;">${loc.difference > 0 ? '+' : ''}${loc.percentage}%</span><br/>
              <b>Risk Level:</b> <span style="font-weight: bold; color: ${loc.risk === 'CRITICAL' ? '#DC2626' : loc.risk === 'HIGH' ? '#EF4444' : loc.risk === 'MEDIUM' ? '#F59E0B' : '#10B981'};">${loc.risk}</span>
            </div>
          `);
        });

        clusterMapRef.current = map;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [activeTab, leafletReady, clusterData, clusterChartType]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (clusterMapRef.current) {
        clusterMapRef.current.remove();
        clusterMapRef.current = null;
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

  const handleApplyClusterFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClusterData();
  };

  const handleClearClusterFilters = () => {
    setClusterDistrict('');
    setClusterStation('');
    setClusterCrimeCategory('');
    setClusterCrimeType('');
    setClusterStartDate('');
    setClusterEndDate('');
    setClusterYear('');
    setClusterMonth('');
    setTimeout(() => {
      fetchClusterData();
    }, 50);
  };

  const getClusterFilteredStations = () => {
    if (!filterOpts) return [];
    if (!clusterDistrict) return filterOpts.stations;
    return filterOpts.stations.filter(s => s.DistrictID === clusterDistrict);
  };

  const getClusterFilteredSubHeads = () => {
    if (!filterOpts || !filterOpts.crimeSubHeads) return [];
    if (!clusterCrimeCategory) return filterOpts.crimeSubHeads;
    const category = filterOpts.crimeCategories?.find(c => c.ROWID === clusterCrimeCategory);
    if (!category) return filterOpts.crimeSubHeads;
    return filterOpts.crimeSubHeads.filter(s => s.CrimeHeadID === category.ROWID);
  };

  const handleApplySeasonalFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSeasonalData();
  };

  const handleClearSeasonalFilters = () => {
    setSeasonDistrict('');
    setSeasonStation('');
    setSeasonCrimeCategory('');
    setSeasonCrimeType('');
    setSeasonStartDate('');
    setSeasonEndDate('');
    setSeasonYear('');
    setSeasonMonth('');
    setSeasonSeason('');
    setTimeout(() => {
      fetchSeasonalData();
    }, 50);
  };

  const getSeasonalFilteredStations = () => {
    if (!filterOpts) return [];
    if (!seasonDistrict) return filterOpts.stations;
    return filterOpts.stations.filter(s => s.DistrictID === seasonDistrict);
  };

  const getSeasonalFilteredSubHeads = () => {
    if (!filterOpts || !filterOpts.crimeSubHeads) return [];
    if (!seasonCrimeCategory) return filterOpts.crimeSubHeads;
    const category = filterOpts.crimeCategories?.find(c => c.ROWID === seasonCrimeCategory);
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

  const trendChart = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    return (
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
    );
  }, [chartData, activeChartType, activeTrendType]);

  const getSeasonalChartData = () => {
    if (!seasonalData || !seasonalData.distributions) return [];
    
    const dists = seasonalData.distributions;
    switch (seasonActiveDimension) {
      case 'monthly':
        return dists.monthly.map((d: any) => ({ name: d.month, Crimes: d.count }));
      case 'quarterly':
        return dists.quarterly.map((d: any) => ({ name: d.quarter, Crimes: d.count }));
      case 'seasonal':
        return dists.seasonal.map((d: any) => ({ name: d.season, Crimes: d.count }));
      case 'weekdayWeekend':
        return dists.weekdayWeekend.map((d: any) => ({ name: d.type, Crimes: d.count }));
      case 'dayOfWeek':
        return dists.dayOfWeek.map((d: any) => ({ name: d.day, Crimes: d.count }));
      case 'yearWiseSeasonal':
        return dists.yearWiseSeasonal.map((d: any) => ({ name: d.year, ...d }));
      case 'crimeTypeSeason':
        return dists.crimeTypeSeason.map((d: any) => ({ name: d.crimeCategory, ...d }));
      case 'districtSeason':
        return dists.districtSeason.map((d: any) => ({ name: d.district, ...d }));
      case 'stationSeason':
        return dists.stationSeason.map((d: any) => ({ name: d.station, ...d }));
      default:
        return [];
    }
  };

  const seasonChartData = getSeasonalChartData();

  const seasonChart = React.useMemo(() => {
    if (!seasonChartData || seasonChartData.length === 0) return null;
    const isMultiSeries = ['yearWiseSeasonal', 'crimeTypeSeason', 'districtSeason', 'stationSeason'].includes(seasonActiveDimension);
    const SEASONS = ['Winter', 'Summer', 'Monsoon', 'Autumn'];

    if (seasonChartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={seasonChartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
            <Legend />
            {isMultiSeries ? (
              SEASONS.map((season, idx) => (
                <Line key={season} type="monotone" dataKey={season} stroke={COLORS[idx % COLORS.length]} strokeWidth={2.5} activeDot={{ r: 6 }} />
              ))
            ) : (
              <Line type="monotone" dataKey="Crimes" stroke="#1E3A8A" strokeWidth={3} activeDot={{ r: 8 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (seasonChartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={seasonChartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
            <Legend />
            {isMultiSeries ? (
              SEASONS.map((season, idx) => (
                <Area key={season} type="monotone" dataKey={season} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.15} />
              ))
            ) : (
              <Area type="monotone" dataKey="Crimes" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.2} strokeWidth={2} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (seasonChartType === 'pie') {
      if (isMultiSeries) {
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
            <Alert severity="info">
              Pie charts are only available for single-series distributions. Please select Monthly, Quarter-wise, Season-wise, Day-of-week, or Weekday/Weekend.
            </Alert>
          </Box>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={seasonChartData} dataKey="Crimes" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
              {seasonChartData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (seasonChartType === 'heatmap') {
      if (!seasonalData?.heatmaps) return null;
      const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      if (seasonActiveDimension === 'monthly' || ['crimeTypeSeason', 'districtSeason', 'stationSeason'].includes(seasonActiveDimension)) {
        const monthlyHeatmap = seasonalData.heatmaps.monthlyHeatmap || [];
        const categories = [...new Set(monthlyHeatmap.map((d: any) => d.category))] as string[];
        const maxCount = Math.max(...monthlyHeatmap.map((d: any) => d.count), 1);

        return (
          <Box sx={{ overflowX: 'auto', py: 1 }}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', boxShadow: 'none', minWidth: 650 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #E5E7EB' }}>Month</TableCell>
                    {categories.map(cat => (
                      <TableCell key={cat} align="center" sx={{ fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {cat}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MONTH_NAMES.map(month => {
                    return (
                      <TableRow key={month} hover>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
                          {month}
                        </TableCell>
                        {categories.map(cat => {
                          const cell = monthlyHeatmap.find((d: any) => d.month === month && d.category === cat);
                          const count = cell ? cell.count : 0;
                          const intensity = count > 0 ? 95 - (count / maxCount) * 55 : 100;
                          const bgColor = count > 0 ? `hsl(220, 85%, ${intensity}%)` : '#FFFFFF';
                          const textColor = count > 0 && intensity < 60 ? '#FFFFFF' : '#1E293B';
                          return (
                            <TableCell
                              key={cat}
                              align="center"
                              title={`${month} - ${cat}: ${count} cases`}
                              sx={{
                                bgcolor: bgColor,
                                color: textColor,
                                fontWeight: count > 0 ? 'bold' : 'normal',
                                fontSize: '12px',
                                borderRight: '1px solid #F3F4F6',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  filter: 'brightness(0.9)',
                                  cursor: 'pointer'
                                }
                              }}
                            >
                              {count}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      } else {
        const calendarHeatmap = seasonalData.heatmaps.calendarHeatmap || [];
        const maxCount = Math.max(...calendarHeatmap.map((d: any) => d.count), 1);

        return (
          <Box sx={{ overflowX: 'auto', py: 1 }}>
            <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', boxShadow: 'none', minWidth: 600 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #E5E7EB' }}>Month</TableCell>
                    {DAY_NAMES.map(day => (
                      <TableCell key={day} align="center" sx={{ fontWeight: 'bold', fontSize: '11px' }}>
                        {day}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MONTH_NAMES.map(month => {
                    return (
                      <TableRow key={month} hover>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #E5E7EB', bgcolor: '#F9FAFB' }}>
                          {month}
                        </TableCell>
                        {DAY_NAMES.map(day => {
                          const cell = calendarHeatmap.find((d: any) => d.month === month && d.day === day);
                          const count = cell ? cell.count : 0;
                          const intensity = count > 0 ? 95 - (count / maxCount) * 55 : 100;
                          const bgColor = count > 0 ? `hsl(210, 85%, ${intensity}%)` : '#FFFFFF';
                          const textColor = count > 0 && intensity < 60 ? '#FFFFFF' : '#1E293B';
                          return (
                            <TableCell
                              key={day}
                              align="center"
                              title={`${month} - ${day}: ${count} cases`}
                              sx={{
                                bgcolor: bgColor,
                                color: textColor,
                                fontWeight: count > 0 ? 'bold' : 'normal',
                                fontSize: '12px',
                                borderRight: '1px solid #F3F4F6',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  filter: 'brightness(0.9)',
                                  cursor: 'pointer'
                                }
                              }}
                            >
                              {count}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      }
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={seasonChartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
          <Legend />
          {isMultiSeries ? (
            SEASONS.map((season, idx) => (
              <Bar key={season} dataKey={season} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} barSize={20} />
            ))
          ) : (
            <Bar dataKey="Crimes" fill="#1E3A8A" radius={[4, 4, 0, 0]} barSize={32} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }, [seasonChartData, seasonChartType, seasonActiveDimension, seasonalData]);

  const hotspotVisualContent = React.useMemo(() => {
    if (!hotspotData) return null;
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
  }, [hotspotData, hotspotDimension, hotspotChartType, hotspotLimit]);

  const clusterVisualContent = React.useMemo(() => {
    if (!clusterData) return null;
    
    const rankedList = clusterData.rankings[clusterDimension] || [];
    const displayData = rankedList.slice(0, clusterLimit);
    const hasCoords = clusterData.rankings.locations.some((l: any) => l.lat && l.lng);
    const showMapFallback = clusterChartType === 'map' && (clusterDimension !== 'locations' || !hasCoords);

    if (showMapFallback) {
      const fallbackReason = clusterDimension !== 'locations'
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
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Previous Count</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Current Count</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Difference</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Growth</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Risk Level</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(clusterData.rankings.stations || []).slice(0, clusterLimit).map((item: any) => (
                  <TableRow key={item.rank} hover>
                    <TableCell>{item.rank}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                    <TableCell align="right">{item.previousCount}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.currentCount}</TableCell>
                    <TableCell align="right" sx={{ color: item.difference > 0 ? '#DC2626' : item.difference < 0 ? '#16A34A' : '#4B5563', fontWeight: 'bold' }}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: item.difference > 0 ? '#DC2626' : item.difference < 0 ? '#16A34A' : '#4B5563' }}>
                      {item.difference > 0 ? `+` : ''}{item.percentage}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.risk}
                        size="small"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: item.risk === 'CRITICAL' ? '#FEE2E2' : item.risk === 'HIGH' ? '#FFEDD5' : item.risk === 'MEDIUM' ? '#FEF3C7' : '#E0F2FE',
                          color: item.risk === 'CRITICAL' ? '#991B1B' : item.risk === 'HIGH' ? '#C2410C' : item.risk === 'MEDIUM' ? '#D97706' : '#0369A1'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.trend}
                        size="small"
                        variant="outlined"
                        color={item.trend === 'Increasing' ? 'error' : item.trend === 'Decreasing' ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }

    if (clusterChartType === 'map') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
            Interactive Crime Clusters Map (Top {displayData.length} Locations)
          </Typography>
          <div
            id="cluster-map"
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

    if (clusterChartType === 'table') {
      return (
        <TableContainer component={Paper} sx={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F9FAFB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {clusterDimension === 'districts' ? 'District' :
                   clusterDimension === 'stations' ? 'Police Station' :
                   clusterDimension === 'locations' ? 'Coordinates / Station' :
                   clusterDimension === 'crimeCategories' ? 'Crime Category' : 'Crime Type'}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Previous Count</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Current Count</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Difference</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Growth</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Risk Level</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Trend</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((item: any) => (
                <TableRow key={item.rank} hover>
                  <TableCell>{item.rank}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                  <TableCell align="right">{item.previousCount}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.currentCount}</TableCell>
                  <TableCell align="right" sx={{ color: item.difference > 0 ? '#DC2626' : item.difference < 0 ? '#16A34A' : '#4B5563', fontWeight: 'bold' }}>
                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: item.difference > 0 ? '#DC2626' : item.difference < 0 ? '#16A34A' : '#4B5563' }}>
                    {item.difference > 0 ? `+` : ''}{item.percentage}%
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.risk}
                      size="small"
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: item.risk === 'CRITICAL' ? '#FEE2E2' : item.risk === 'HIGH' ? '#FFEDD5' : item.risk === 'MEDIUM' ? '#FEF3C7' : '#E0F2FE',
                        color: item.risk === 'CRITICAL' ? '#991B1B' : item.risk === 'HIGH' ? '#C2410C' : item.risk === 'MEDIUM' ? '#D97706' : '#0369A1'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.trend}
                      size="small"
                      variant="outlined"
                      color={item.trend === 'Increasing' ? 'error' : item.trend === 'Decreasing' ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    if (clusterChartType === 'line') {
      return (
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} angle={-45} textAnchor="end" height={80} tickFormatter={(val) => val.substring(0, 20)} />
              <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Line type="monotone" dataKey="previousCount" name="Previous Count" stroke="#9CA3AF" strokeWidth={2} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="currentCount" name="Current Count" stroke="#1E3A8A" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      );
    }

    if (clusterChartType === 'horizontal') {
      return (
        <Box sx={{ width: '100%', height: Math.max(300, displayData.length * 45) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={displayData} margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={120} tickFormatter={(val) => val.substring(0, 20)} />
              <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Bar dataKey="previousCount" name="Previous Count" fill="#9CA3AF" radius={[0, 4, 4, 0]} />
              <Bar dataKey="currentCount" name="Current Count" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      );
    }

    // Default: Vertical Clustered Bar Chart
    return (
      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} angle={-45} textAnchor="end" height={80} tickFormatter={(val) => val.substring(0, 20)} />
            <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB' }} />
            <Legend />
            <Bar dataKey="previousCount" name="Previous Count" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
            <Bar dataKey="currentCount" name="Current Count" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  }, [clusterData, clusterDimension, clusterChartType, clusterLimit]);

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
          <Tab label="Demographics" icon={<PieChartIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Socio-economic" icon={<SocioIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Social Risk" icon={<RiskIcon fontSize="small" />} iconPosition="start" />
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
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(5, 1fr)'
                  },
                  gridAutoRows: '1fr',
                  gap: '20px',
                  width: '100%',
                  mb: 3.5,
                  boxSizing: 'border-box'
                }}
              >
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      TOTAL CRIMES
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {trendData.stats.totalCrimes}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      AVG CRIMES
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {averageCrimesValue}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      PEAK MONTH
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.8, wordBreak: 'break-all' }}>
                      {trendData.stats.highestMonth}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      PEAK DAY
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                      {trendData.stats.highestDay}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      TOP CRIME CATEGORY
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5, lineHeight: 1.2 }}>
                      {trendData.stats.mostFrequentType}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

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
                    {trendChart}
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
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(6, 1fr)'
                  },
                  gridAutoRows: '1fr',
                  gap: '16px',
                  width: '100%',
                  mb: 3.5,
                  boxSizing: 'border-box'
                }}
              >
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      TOTAL CRIMES
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {hotspotData.summary.totalCrimes}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      TOTAL HOTSPOTS
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {hotspotData.summary.totalHotspots}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      HIGHEST CRIME DISTRICT
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.8, wordBreak: 'break-all' }}>
                      {hotspotData.summary.highestDistrict}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      HIGHEST CRIME STATION
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                      {hotspotData.summary.highestStation}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      HIGHEST CRIME LOCATION
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                      {hotspotData.summary.highestLocation}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      MOST COMMON CRIME TYPE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5, lineHeight: 1.2 }}>
                      {hotspotData.summary.mostCommonCrimeType}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

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
                  {hotspotVisualContent}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
      {activeTab === 2 && (
        <>
          {/* Optional Filters Form Card */}
          <Card sx={{ mb: 3.5, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3 }}>
              <Box component="form" onSubmit={handleApplyClusterFilters}>
                <Grid container spacing={2.5}>
                  
                  {/* Interval Selector */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-interval-label">Comparison Period</InputLabel>
                      <Select
                        labelId="cluster-interval-label"
                        value={clusterInterval}
                        label="Comparison Period"
                        onChange={(e) => setClusterInterval(e.target.value)}
                      >
                        <MenuItem value="month">Month-over-Month (MoM)</MenuItem>
                        <MenuItem value="quarter">Quarter-over-Quarter (QoQ)</MenuItem>
                        <MenuItem value="year">Year-over-Year (YoY)</MenuItem>
                        <MenuItem value="week">Week-over-Week (WoW)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* District Option */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-district-label">District</InputLabel>
                      <Select
                        labelId="cluster-district-label"
                        value={clusterDistrict}
                        label="District"
                        onChange={(e) => {
                          setClusterDistrict(e.target.value);
                          setClusterStation('');
                        }}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {filterOpts?.districts.map((d) => (
                          <MenuItem key={d.ROWID} value={d.ROWID}>{d.DistrictName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Station Option */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-station-label">Police Station</InputLabel>
                      <Select
                        labelId="cluster-station-label"
                        value={clusterStation}
                        label="Police Station"
                        onChange={(e) => setClusterStation(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {getClusterFilteredStations().map((s) => (
                          <MenuItem key={s.ROWID} value={s.ROWID}>{s.UnitName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Crime Category Option */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-category-label">Crime Category</InputLabel>
                      <Select
                        labelId="cluster-category-label"
                        value={clusterCrimeCategory}
                        label="Crime Category"
                        onChange={(e) => {
                          setClusterCrimeCategory(e.target.value);
                          setClusterCrimeType('');
                        }}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {filterOpts?.crimeCategories?.map((c) => (
                          <MenuItem key={c.ROWID} value={c.ROWID}>{c.CrimeGroupName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Specific Crime Type Option */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-type-label">Crime Type</InputLabel>
                      <Select
                        labelId="cluster-type-label"
                        value={clusterCrimeType}
                        label="Crime Type"
                        onChange={(e) => setClusterCrimeType(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {getClusterFilteredSubHeads().map((sh) => (
                          <MenuItem key={sh.ROWID} value={sh.ROWID}>{sh.CrimeHeadName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Date Range Start */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={clusterStartDate}
                      onChange={(e) => setClusterStartDate(e.target.value)}
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>

                  {/* Date Range End */}
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      label="End Date"
                      type="date"
                      value={clusterEndDate}
                      onChange={(e) => setClusterEndDate(e.target.value)}
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>

                  {/* Optional Year Select */}
                  <Grid size={{ xs: 12, md: 1.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-year-label">Year</InputLabel>
                      <Select
                        labelId="cluster-year-label"
                        value={clusterYear}
                        label="Year"
                        onChange={(e) => setClusterYear(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value="2024">2024</MenuItem>
                        <MenuItem value="2023">2023</MenuItem>
                        <MenuItem value="2022">2022</MenuItem>
                        <MenuItem value="2021">2021</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Optional Month Select */}
                  <Grid size={{ xs: 12, md: 1.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="cluster-month-label">Month</InputLabel>
                      <Select
                        labelId="cluster-month-label"
                        value={clusterMonth}
                        label="Month"
                        onChange={(e) => setClusterMonth(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        <MenuItem value="1">January</MenuItem>
                        <MenuItem value="2">February</MenuItem>
                        <MenuItem value="3">March</MenuItem>
                        <MenuItem value="4">April</MenuItem>
                        <MenuItem value="5">May</MenuItem>
                        <MenuItem value="6">June</MenuItem>
                        <MenuItem value="7">July</MenuItem>
                        <MenuItem value="8">August</MenuItem>
                        <MenuItem value="9">September</MenuItem>
                        <MenuItem value="10">October</MenuItem>
                        <MenuItem value="11">November</MenuItem>
                        <MenuItem value="12">December</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Filter Action Buttons */}
                  <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<ClearIcon />}
                      onClick={handleClearClusterFilters}
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

          {/* Loading Indicator */}
          {clusterLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={40} sx={{ mr: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Analyzing database historical crime clusters...
              </Typography>
            </Box>
          )}

          {/* Error Alert */}
          {clusterError && !clusterLoading && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {clusterError}
            </Alert>
          )}

          {/* Insufficient Historical Data Alert */}
          {!clusterLoading && !clusterError && clusterData && clusterData.totalRecords === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Not enough historical data to detect crime clusters.
            </Alert>
          )}

          {/* Dashboard Visual Panels */}
          {!clusterLoading && !clusterError && clusterData && clusterData.totalRecords > 0 && (
            <>
              {/* Summary Metric Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(6, 1fr)'
                  },
                  gridAutoRows: '1fr',
                  gap: '16px',
                  width: '100%',
                  mb: 3.5,
                  boxSizing: 'border-box'
                }}
              >
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      ACTIVE CLUSTERS
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {clusterData.summary.clusterCount}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      AVERAGE GROWTH
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      +{clusterData.summary.avgGrowth}%
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      HIGHEST GROWTH DISTRICT
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.8, wordBreak: 'break-all' }}>
                      {clusterData.summary.highestGrowthDistrict}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      HIGHEST GROWTH STATION
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                      {clusterData.summary.highestGrowthStation}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      LARGEST CRIME INCREASE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 1, wordBreak: 'break-all' }}>
                      {clusterData.summary.largestCrimeIncrease}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      FASTEST GROWING CRIME TYPE
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5, lineHeight: 1.2 }}>
                      {clusterData.summary.fastestGrowingCrimeType}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Insights Card */}
              <Card 
                sx={{ 
                  mb: 3.5, 
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : '#DBEAFE',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : '#EFF6FF',
                  boxShadow: 'none' 
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.mode === 'dark' ? 'primary.light' : '#1E40AF', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon fontSize="small" /> Automated Cluster Intelligence & Insights
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'text.primary', fontSize: '13.5px', fontFamily: 'inherit', lineHeight: 1.6 }}>
                    {clusterData.insights.map((insight: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: idx === clusterData.insights.length - 1 ? 0 : '6px' }}>{insight}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

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
                          value={clusterDimension}
                          exclusive
                          onChange={(_, val) => val && setClusterDimension(val)}
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
                          value={clusterChartType}
                          exclusive
                          onChange={(_, val) => val && setClusterChartType(val)}
                          color="primary"
                        >
                          <ToggleButton value="bar" title="Clustered Bar Chart"><BarChartIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="horizontal" title="Horizontal Clustered Chart"><PinIcon fontSize="small" style={{ transform: 'rotate(90deg)' }} /></ToggleButton>
                          <ToggleButton value="line" title="Line Comparison Chart"><LineChartIcon fontSize="small" /></ToggleButton>
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
                          value={clusterLimit}
                          exclusive
                          onChange={(_, val) => val && setClusterLimit(val)}
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
                  {clusterVisualContent}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
      {activeTab === 3 && (
        <>
          {/* Filters Form */}
          <Card sx={{ mb: 3, boxShadow: 'none', border: '1px solid #E5E7EB' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box component="form" onSubmit={handleApplySeasonalFilters}>
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
                        value={seasonDistrict}
                        label="District"
                        onChange={(e) => {
                          setSeasonDistrict(e.target.value);
                          setSeasonStation('');
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
                        value={seasonStation}
                        label="Police Station"
                        onChange={(e) => setSeasonStation(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None (All Stations)</em>
                        </MenuItem>
                        {getSeasonalFilteredStations().map(s => (
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
                        value={seasonCrimeCategory}
                        label="Crime Category"
                        onChange={(e) => {
                          setSeasonCrimeCategory(e.target.value);
                          setSeasonCrimeType('');
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
                        value={seasonCrimeType}
                        label="Crime Type"
                        onChange={(e) => setSeasonCrimeType(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None (All Types)</em>
                        </MenuItem>
                        {getSeasonalFilteredSubHeads().map(s => (
                          <MenuItem key={s.ROWID} value={s.ROWID}>
                            {s.CrimeHeadName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Season</InputLabel>
                      <Select
                        value={seasonSeason}
                        label="Season"
                        onChange={(e) => setSeasonSeason(e.target.value)}
                      >
                        <MenuItem value=""><em>None (All)</em></MenuItem>
                        <MenuItem value="Winter">Winter</MenuItem>
                        <MenuItem value="Summer">Summer</MenuItem>
                        <MenuItem value="Monsoon">Monsoon</MenuItem>
                        <MenuItem value="Autumn">Autumn</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Month</InputLabel>
                      <Select
                        value={seasonMonth}
                        label="Month"
                        onChange={(e) => setSeasonMonth(e.target.value)}
                      >
                        <MenuItem value=""><em>None (All)</em></MenuItem>
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
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={seasonYear}
                        label="Year"
                        onChange={(e) => setSeasonYear(e.target.value)}
                      >
                        <MenuItem value=""><em>None</em></MenuItem>
                        {['2021', '2022', '2023', '2024', '2025'].map(y => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
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
                      value={seasonStartDate}
                      onChange={(e) => setSeasonStartDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="End Date"
                      type="date"
                      value={seasonEndDate}
                      onChange={(e) => setSeasonEndDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>

                  {/* Form Actions */}
                  <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<ClearIcon />}
                      onClick={handleClearSeasonalFilters}
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

          {/* Loading Indicator */}
          {seasonalLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={40} sx={{ mr: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Analyzing database historical seasonal patterns...
              </Typography>
            </Box>
          )}

          {/* Error Alert */}
          {seasonalError && !seasonalLoading && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {seasonalError}
            </Alert>
          )}

          {/* Insufficient Historical Data Alert */}
          {!seasonalLoading && !seasonalError && seasonalData && seasonalData.totalRecords === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Not enough historical data available for seasonal analysis.
            </Alert>
          )}

          {/* Dashboard Visual Panels */}
          {!seasonalLoading && !seasonalError && seasonalData && seasonalData.totalRecords > 0 && (
            <>
              {/* Summary Metric Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(6, 1fr)'
                  },
                  gridAutoRows: '1fr',
                  gap: '16px',
                  width: '100%',
                  mb: 3.5,
                  boxSizing: 'border-box'
                }}
              >
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      PEAK SEASON
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {seasonalData.summary.highestCrimeSeason}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      LOWEST SEASON
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {seasonalData.summary.lowestCrimeSeason}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      PEAK MONTH
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 0.5 }}>
                      {seasonalData.summary.highestCrimeMonth}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      PEAK WEEKDAY
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5 }}>
                      {seasonalData.summary.highestCrimeWeekday}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      WEEKEND CRIMES
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5 }}>
                      {seasonalData.summary.highestCrimeWeekendCount}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', boxSizing: 'border-box', border: '1px solid', borderColor: 'divider', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>
                      PEAK SEASON CRIME
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5, lineHeight: 1.2 }}>
                      {seasonalData.summary.mostCommonSeasonalCrimeType}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Insights Card */}
              <Card 
                sx={{ 
                  mb: 3.5, 
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : '#DBEAFE',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : '#EFF6FF',
                  boxShadow: 'none' 
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: (theme) => theme.palette.mode === 'dark' ? 'primary.light' : '#1E40AF', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon fontSize="small" /> Automated Seasonal Intelligence & Insights
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: 'text.primary', fontSize: '13.5px', fontFamily: 'inherit', lineHeight: 1.6 }}>
                    {seasonalData.insights.map((insight: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: idx === seasonalData.insights.length - 1 ? 0 : '6px' }}>{insight}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Controls Card */}
              <Card sx={{ mb: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Grid size={{ xs: 12, lg: 7.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          Analyze By:
                        </Typography>
                        <ToggleButtonGroup
                          size="small"
                          value={seasonActiveDimension}
                          exclusive
                          onChange={(_, val) => val && setSeasonActiveDimension(val)}
                          color="primary"
                        >
                          <ToggleButton value="monthly" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Month</ToggleButton>
                          <ToggleButton value="quarterly" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Quarter</ToggleButton>
                          <ToggleButton value="seasonal" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Season</ToggleButton>
                          <ToggleButton value="weekdayWeekend" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Weekend</ToggleButton>
                          <ToggleButton value="dayOfWeek" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Weekday</ToggleButton>
                          <ToggleButton value="yearWiseSeasonal" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Year-Seasonal</ToggleButton>
                          <ToggleButton value="crimeTypeSeason" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Crime-Season</ToggleButton>
                          <ToggleButton value="districtSeason" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Dist-Season</ToggleButton>
                          <ToggleButton value="stationSeason" sx={{ fontWeight: 'bold', fontSize: '11px', px: 1 }}>Station-Season</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, lg: 4.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          Show:
                        </Typography>
                        <ToggleButtonGroup
                          size="small"
                          value={seasonChartType}
                          exclusive
                          onChange={(_, val) => val && setSeasonChartType(val)}
                          color="primary"
                        >
                          <ToggleButton value="bar" title="Bar Chart"><BarChartIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="line" title="Line Chart"><LineChartIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="area" title="Area Chart"><TimelineIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="pie" title="Pie Chart"><PieChartIcon fontSize="small" /></ToggleButton>
                          <ToggleButton value="heatmap" title="Heatmap View"><TableIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Main Panel Content */}
              <Card sx={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3, minHeight: 400 }}>
                  <Box sx={{ width: '100%', height: 400 }}>
                    {seasonChart}
                  </Box>
                </CardContent>
              </Card>

              {/* Event Calendar Status box */}
              <Card sx={{ mt: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1 }}>
                    Holidays / Festivals / Elections Calendar
                  </Typography>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    No event calendar configured.
                  </Alert>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Tab 4 Content: Demographics */}
      {activeTab === 4 && <DemographicsTab filterOpts={filterOpts} />}

      {/* Tab 5 Content: Socio-economic */}
      {activeTab === 5 && <SocioEconomicTab filterOpts={filterOpts} />}

      {/* Tab 6 Content: Social Risk */}
      {activeTab === 6 && <SocialRiskTab filterOpts={{ startDate, endDate, district: selectedDistrict, policeStation: selectedStation, crimeType: selectedCrimeType }} />}
    </Box>
  );
};

export default AnalyticsPage;
