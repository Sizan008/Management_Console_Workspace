import { Routes } from '@angular/router';
import { ReportDbSetupUI } from './report-db-setup-ui/report-db-setup-ui';
import { ReportApiSetupUI } from './report-api-setup-ui/report-api-setup-ui';
import { ReportGenerationUI } from './report-generation-ui/report-generation-ui';
import { ReportParameterListUI } from './report-parameter-list-ui/report-parameter-list-ui';

export const reportRoutes: Routes = [
    {path: 'report-db-setup', component: ReportDbSetupUI},
    {path: 'report-api-setup', component: ReportApiSetupUI},
    {path: 'report-registration', component: ReportParameterListUI},
    {path: 'report-generation', component: ReportGenerationUI}
  ];