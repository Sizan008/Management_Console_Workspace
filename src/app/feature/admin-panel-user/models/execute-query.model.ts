/**
 * execute-query / shared — model types.
 *
 * Mirrors the demo's ExecuteQuery.vue (QueryBuilder → Execute Data Report).
 * The page is the read-only sibling of GenerateQuery.vue: the user
 * picks a pre-defined saved query from a grid, fills in the parameter
 * inputs (Branch ID, Trans Date, From Date, To Date, Transfer Type),
 * and clicks Execute. The resulting rows render in the "Result Data"
 * grid; the same data can be downloaded as an .xlsx file.
 *
 * Differences from GenerateQuery.vue:
 *   - QueryTitle and Purpose are read-only (mirrors demo's `:disabled="true"`).
 *   - QueryText is hidden from the user — it's still part of the form
 *     model so the run-query logic can use it.
 *   - The All Data Report grid does NOT expose the queryText column.
 *   - For branch users, the listing is filtered to items whose
 *     `accessRule == 'Branch'`. For head-office users, all items show.
 */

/** Standard API envelope used by every CloudNetManagementAPI endpoint. */
export interface ApiResponse<T> {
  Status: 'OK' | 'UNAUTH' | string;
  Message: string;
  Result: T;
}

/**
 * A previously saved query, returned by GET /QueryBuilder/GetAllQuery
 * and rendered in the "All Data Report" grid.
 *
 * Field names mirror the demo's `allQueryHeader` columns exactly:
 *   queryID, queryTitle, queryText, purpose, makeBy, makeDate
 *
 * The `accessRule` field is used by the demo to filter the listing
 * for branch users (only items with `accessRule === 'Branch'` show).
 */
export interface SavedQuery {
  queryID: number;
  queryTitle: string;
  queryText: string;
  purpose: string;
  makeBy?: string;
  makeDate?: string;
  /** Filter flag used by the demo: 'Branch' for branch-restricted queries. */
  accessRule?: string;
}

/**
 * A single row in the result-data grid. The grid builds its columns
 * from the first row's keys so we keep the row shape permissive.
 */
export type QueryResultRow = Record<string, string | number | boolean | null>;

/**
 * One transfer-type option for the Transfer Type dropdown. The demo
 * fetches these from /TransactionOrBillService/GetAllTransactionOrBillServiceType
 * and filters by a fixed list of service IDs.
 */
export interface TransferTypeOption {
  serviceId: string;
  serviceName: string;
}

/** Body shape for POST /QueryBuilder/GetDataByQuery. */
export interface GetDataByQueryPayload {
  QueryText: string;
}
