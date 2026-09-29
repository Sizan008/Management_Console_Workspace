/**
 * Query Definition Model - represents a visual query built from UI
 * This is stored as JSON in the widget's queryDefinition CLOB field
 */

export interface QueryDefinition {
  entity: string;                          // Technical entity name: "GoodsReceiveEntity"
  selectedColumns: string[];               // Properties to display: ["receiveDate", "qtyReceived"]
  filters?: FilterDefinition[];            // Optional WHERE clauses
  joins?: JoinDefinition[];                // Optional JOINs to other entities
  groupBy?: string[];                      // Optional GROUP BY columns
  aggregations?: AggregationDefinition[]; // Optional aggregation functions
}

export interface FilterDefinition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'BETWEEN';
  value: string | number | string[];
  logicOperator?: 'AND' | 'OR'; // Default: AND
}

export interface JoinDefinition {
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  targetEntity: string;                    // Technical entity name: "SupplierEntity"
  onCondition: string;                     // Join condition: "GoodsReceiveEntity.supplierId = SupplierEntity.id"
}

export interface AggregationDefinition {
  function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  column: string;
}
