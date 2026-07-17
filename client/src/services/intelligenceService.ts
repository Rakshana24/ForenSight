import api from './api';

export interface GraphData {
  case: any;
  officer: any;
  unit: any;
  court: any;
  victims: any[];
  accused: any[];
  relationshipInsights?: {
    repeatOffenders: any[];
    repeatVictims: any[];
    relatedOfficerCases: any[];
    relatedUnitCases: any[];
    summary: string[];
  };
  organizedCrimeIndicators?: {
    riskLevel: string;
    confidence: number;
    reasons: string[];
    coOffenders: any[];
  };
  graph?: {
    nodes: any[];
    edges: any[];
  };
}

export interface CaseSummary {
  CaseMasterID: number | string;
  CrimeNo: string;
  CrimeRegisteredDate: string;
  BriefFacts: string;
}

export const intelligenceService = {
  getRelationshipGraph: async (caseID: string): Promise<GraphData> => {
    const response = await api.get('/intelligence/relationship-graph', {
      params: { caseID }
    });
    return response.data;
  },
  searchCases: async (searchType: string, searchValue: string): Promise<CaseSummary[]> => {
    const response = await api.get('/intelligence/search', {
      params: { searchType, searchValue }
    });
    return response.data;
  },
  getFilterOptions: async (): Promise<any> => {
    const response = await api.get('/intelligence/analytics/filters');
    return response.data;
  },
  getTrendData: async (filters: any): Promise<any> => {
    const response = await api.get('/intelligence/analytics/trends', {
      params: filters
    });
    return response.data;
  }
};
