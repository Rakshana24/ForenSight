import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  CircularProgress,
  Divider,
  Alert,
  Chip,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { intelligenceService, type GraphData, type CaseSummary } from '../../services/intelligenceService';
import NetworkGraph from '../../components/Intelligence/NetworkGraph';

const Intelligence: React.FC = () => {
  const [searchType, setSearchType] = useState('Case ID');
  const [searchValue, setSearchValue] = useState('');
  const [caseResults, setCaseResults] = useState<CaseSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GraphData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    setData(null);
    setCaseResults(null);

    try {
      const results = await intelligenceService.searchCases(searchType, searchValue);
      if (results.length === 0) {
        setError('No matching record found.');
      } else if (results.length === 1) {
        await fetchGraph(String(results[0].CaseMasterID));
      } else {
        setCaseResults(results);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to perform search.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGraph = async (id: string) => {
    setLoading(true);
    setError('');
    setData(null);
    setCaseResults(null);
    try {
      const result = await intelligenceService.getRelationshipGraph(id);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch relationship data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Criminal Relationship Graph
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        Discover and view relationships between entities inside the crime database.
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Search By</InputLabel>
              <Select
                value={searchType}
                label="Search By"
                onChange={(e) => setSearchType(e.target.value)}
              >
                <MenuItem value="Case ID">Case ID</MenuItem>
                <MenuItem value="Crime Number">Crime Number</MenuItem>
                <MenuItem value="Case Number">Case Number</MenuItem>
                <MenuItem value="Accused ID">Accused ID</MenuItem>
                <MenuItem value="Person ID">Person ID</MenuItem>
                <MenuItem value="Accused Name">Accused Name</MenuItem>
                <MenuItem value="Victim ID">Victim ID</MenuItem>
                <MenuItem value="Victim Name">Victim Name</MenuItem>
                <MenuItem value="Employee ID">Employee ID</MenuItem>
                <MenuItem value="Officer Name">Officer Name</MenuItem>
                <MenuItem value="KGID">KGID</MenuItem>
                <MenuItem value="Station ID">Station ID</MenuItem>
                <MenuItem value="Station Name">Station Name</MenuItem>
                <MenuItem value="Court ID">Court ID</MenuItem>
                <MenuItem value="Court Name">Court Name</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Search Value"
              variant="outlined"
              size="small"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              fullWidth
              placeholder={`Enter ${searchType}`}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{ px: 4 }}
            >
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {caseResults && (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Crime Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Crime Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Brief Facts</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {caseResults.map((row) => (
                <TableRow key={row.CaseMasterID} hover>
                  <TableCell>{row.CaseMasterID}</TableCell>
                  <TableCell>{row.CrimeNo}</TableCell>
                  <TableCell>{row.CrimeRegisteredDate}</TableCell>
                  <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.BriefFacts}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="contained" 
                      size="small" 
                      onClick={() => fetchGraph(String(row.CaseMasterID))}
                    >
                      Investigate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Grid container spacing={3}>
            {/* Case Information */}
          {data.case && Object.keys(data.case).length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }} color="primary.main">
                    Case Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2"><strong>Case Master ID:</strong> {data.case.CaseMasterID || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Crime No:</strong> {data.case.CrimeNo || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Case No:</strong> {data.case.CaseNo || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Registered Date:</strong> {data.case.CrimeRegisteredDate || 'N/A'}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}><strong>Brief Facts:</strong></Typography>
                  <Typography variant="body2" color="text.secondary">{data.case.BriefFacts || 'N/A'}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Status:</strong> {data.case.CaseStatusMaster?.CaseStatusName || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Investigating Officer */}
          {data.officer && Object.keys(data.officer).length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary.main">
                    Investigating Officer
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2"><strong>Name:</strong> {data.officer.FirstName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Employee ID:</strong> {data.officer.EmployeeID || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>KGID:</strong> {data.officer.KGID || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>DOB:</strong> {data.officer.EmployeeDOB || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Appointment Date:</strong> {data.officer.AppointmentDate || 'N/A'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Police Unit */}
          {data.unit && Object.keys(data.unit).length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary.main">
                    Police Unit
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2"><strong>Unit Name:</strong> {data.unit.UnitName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Unit ID:</strong> {data.unit.UnitID || 'N/A'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Court */}
          {data.court && Object.keys(data.court).length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary.main">
                    Court
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2"><strong>Court Name:</strong> {data.court.CourtName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Court ID:</strong> {data.court.CourtID || 'N/A'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Victims */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary.main">
                  Victims
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {data.victims && data.victims.length > 0 ? (
                  data.victims.map((victim, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography variant="body2"><strong>Name:</strong> {victim.VictimName || 'N/A'}</Typography>
                      <Typography variant="body2" color="text.secondary">Master ID: {victim.VictimMasterID || 'N/A'}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.disabled">No victims found.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Accused */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary.main">
                  Accused
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {data.accused && data.accused.length > 0 ? (
                  data.accused.map((accusedPerson, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography variant="body2"><strong>Name:</strong> {accusedPerson.AccusedName || 'N/A'}</Typography>
                      <Typography variant="body2" color="text.secondary">Master ID: {accusedPerson.AccusedMasterID || 'N/A'}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.disabled">No accused found.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Relationship Insights */}
          {data.relationshipInsights && (
            <Grid size={12}>
              <Card sx={{ mt: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="primary.dark">
                    Relationship Insights
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* Summary */}
                  {data.relationshipInsights.summary && data.relationshipInsights.summary.length > 0 && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      {data.relationshipInsights.summary.map((msg, idx) => (
                        <div key={idx}>• {msg}</div>
                      ))}
                    </Alert>
                  )}

                  <Grid container spacing={3}>
                    {/* Repeat Offenders */}
                    {data.relationshipInsights.repeatOffenders && data.relationshipInsights.repeatOffenders.length > 0 && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.main' }} gutterBottom>
                          Repeat Offenders
                        </Typography>
                        {data.relationshipInsights.repeatOffenders.map((offender, idx) => (
                          <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                            <Typography variant="body2"><strong>Name:</strong> {offender.name}</Typography>
                            <Typography variant="body2"><strong>Total FIRs:</strong> {offender.totalFIRs}</Typography>
                            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>Related Cases:</Typography>
                            {offender.relatedCases.map((rc: any, cidx: number) => (
                              <Typography key={cidx} variant="caption" color="primary" sx={{ display: 'block' }}>
                                - {rc.CrimeNo} (Case ID: {rc.CaseMasterID})
                              </Typography>
                            ))}
                          </Box>
                        ))}
                      </Grid>
                    )}

                    {/* Repeat Victims */}
                    {data.relationshipInsights.repeatVictims && data.relationshipInsights.repeatVictims.length > 0 && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'warning.main' }} gutterBottom>
                          Repeat Victims
                        </Typography>
                        {data.relationshipInsights.repeatVictims.map((victim, idx) => (
                          <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                            <Typography variant="body2"><strong>Name:</strong> {victim.name}</Typography>
                            <Typography variant="body2"><strong>Total FIRs:</strong> {victim.totalFIRs}</Typography>
                            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>Related Cases:</Typography>
                            {victim.relatedCases.map((rc: any, cidx: number) => (
                              <Typography key={cidx} variant="caption" color="primary" sx={{ display: 'block' }}>
                                - {rc.CrimeNo} (Case ID: {rc.CaseMasterID})
                              </Typography>
                            ))}
                          </Box>
                        ))}
                      </Grid>
                    )}

                    {/* Officer Cases */}
                    {data.relationshipInsights.relatedOfficerCases && data.relationshipInsights.relatedOfficerCases.length > 0 && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'info.main' }} gutterBottom>
                          Other Cases by this Officer
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb', maxHeight: 200, overflowY: 'auto' }}>
                          {data.relationshipInsights.relatedOfficerCases.map((rc: any, idx: number) => (
                            <Typography key={idx} variant="body2" color="text.primary">
                              • Crime No: {rc.CrimeNo} (Case ID: {rc.CaseMasterID})
                            </Typography>
                          ))}
                        </Box>
                      </Grid>
                    )}

                    {/* Unit Cases */}
                    {data.relationshipInsights.relatedUnitCases && data.relationshipInsights.relatedUnitCases.length > 0 && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'success.main' }} gutterBottom>
                          Other Cases in this Unit
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e5e7eb', maxHeight: 200, overflowY: 'auto' }}>
                          {data.relationshipInsights.relatedUnitCases.map((rc: any, idx: number) => (
                            <Typography key={idx} variant="body2" color="text.primary">
                              • Crime No: {rc.CrimeNo} (Case ID: {rc.CaseMasterID})
                            </Typography>
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Organized Crime Detection */}
          {data.organizedCrimeIndicators && (
            <Grid size={12}>
              <Card sx={{ mt: 2, bgcolor: '#fef2f2', border: '1px solid #fca5a5' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ color: 'error.dark', fontWeight: 'bold' }}>
                      Organized Crime Detection
                    </Typography>
                    <Chip 
                      label={`Risk Level: ${data.organizedCrimeIndicators.riskLevel}`} 
                      color={
                        data.organizedCrimeIndicators.riskLevel === 'High' ? 'error' :
                        data.organizedCrimeIndicators.riskLevel === 'Medium' ? 'warning' : 'success'
                      }
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                  <Divider sx={{ mb: 2, borderColor: '#fca5a5' }} />
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      Confidence Score ({data.organizedCrimeIndicators.confidence}%)
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={data.organizedCrimeIndicators.confidence} 
                      color={
                        data.organizedCrimeIndicators.riskLevel === 'High' ? 'error' :
                        data.organizedCrimeIndicators.riskLevel === 'Medium' ? 'warning' : 'success'
                      }
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>
                    Detection Indicators:
                  </Typography>
                  <Alert severity="error" sx={{ bgcolor: 'white' }}>
                    {data.organizedCrimeIndicators.reasons.map((reason, idx) => (
                      <div key={idx} style={{ marginBottom: '8px' }}>• {reason}</div>
                    ))}
                  </Alert>

                  {data.organizedCrimeIndicators.coOffenders && data.organizedCrimeIndicators.coOffenders.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>
                        Co-Offender Syndicates
                      </Typography>
                      {data.organizedCrimeIndicators.coOffenders.map((co, idx) => (
                        <Box key={idx} sx={{ p: 2, bgcolor: 'white', border: '1px solid #fca5a5', borderRadius: 1, mb: 1 }}>
                          <Typography variant="body2">
                            <strong>{co.offenderA}</strong> and <strong>{co.offenderB}</strong> share <strong>{co.sharedCases}</strong> other related FIRs.
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Criminal Network Visualization */}
          {data.graph && data.graph.nodes.length > 0 && (
            <Grid size={12}>
              <Card sx={{ mt: 2, height: 800, width: '100%', border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h5" gutterBottom color="primary.dark">
                    Criminal Network Visualization
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ flex: 1, minHeight: 0 }}>
                    <NetworkGraph nodesData={data.graph.nodes} edgesData={data.graph.edges} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

        </Grid>
        </Box>
      )}
    </Box>
  );
};

export default Intelligence;
