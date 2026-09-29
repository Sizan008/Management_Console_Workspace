export interface DashboardGridRow {
  rowId: string;
  [key: string]: string | number;
}
export interface DashboardColumn {
  key: string;
  aliases: string[];
}
export interface CustomerInfoItem {
  label: string;
  value: string;
}
export interface CustomerInfoCard {
  title: string;
  items: CustomerInfoItem[];
}
