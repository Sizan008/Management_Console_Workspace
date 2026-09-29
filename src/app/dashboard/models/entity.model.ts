export interface MetaDashboardEntity {
  id: number;
  entityName: string;
  entityAlias: string;
  description: string;
  isActive: string;
}

export interface EntityField {
  id: number;
  entityId: number;
  fieldName: string;
  displayName: string;
  dataType: 'VARCHAR' | 'NUMBER' | 'DATE' | 'TIMESTAMP' | 'BOOLEAN';
  isFilterable: number;
  isAggregatable: number;
}
