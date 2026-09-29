import { Widget } from './widget.model';

export interface WidgetLayoutPosition {
  colStart: number;   // 1-12: explicit grid column start
  colSpan: number;    // 1-12: how many columns wide
  rowStart: number;   // 1+:  explicit grid row start
  rowSpan: number;    // 1+:  how many rows tall
  displayMode?: 'visible' | 'hidden';
}

export interface Dashboard {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  applicationId: number; // Application this dashboard belongs to (e.g., 151=AcquireHub)
  widgetCount?: number;   // returned by GET /Dashboard
  widgets?: Widget[];
}

export interface DashboardCreated {
  id: number;
  name: string;
}

export interface DashboardUpdated {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CreateDashboardCommand {
  name: string;
  description: string;
  applicationId: number;
}

export interface UpdateDashboardCommand {
  name: string;
  description: string;
  isActive: boolean;
  applicationId: number;
}
