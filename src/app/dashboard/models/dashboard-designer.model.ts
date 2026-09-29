import { Widget } from './widget-designer.model';

export interface Dashboard {
  id: number;
  moduleCode: string;
  name: string;
  description: string;
  isActive: boolean;
  widgets?: Widget[];
}

export interface CreateDashboardCommand {
  moduleCode: string;
  name: string;
  description: string;
}

export interface UpdateDashboardCommand {
  name: string;
  description: string;
  isActive: boolean;
}
