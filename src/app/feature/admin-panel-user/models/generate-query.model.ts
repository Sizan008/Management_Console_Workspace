/**
 * generate-query / shared — model types.
 *
 * Mirrors the demo's GenerateQuery.vue (QueryBuilder → Generate Data Report).
 *
 * The page has two data shapes:
 *   1. The "All Data Report" grid lists saved queries returned by
 *      GET /QueryBuilder/GetAllQuery.
 *   2. The "Result Data" grid shows the rows returned by running a
 *      query through POST /QueryBuilder/GetDataByQuery.
 *
 * Plus the "Generate Data Report" form has a Title, Purpose, QueryText
 * and a set of parameter fields (Branch ID, Trans Date, From Date,
 * To Date, Transfer Type) that the user binds to `@XXX` placeholders
 * inside QueryText.
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
 * Field names mirror the demo's Vue refs exactly:
 *   queryID, queryTitle, queryText, purpose, makeBy, makeDate
 *
 * The user can click the Select button on a row to load the saved
 * query back into the form (mirrors the demo's `onTestQuery(item)`).
 */
export interface SavedQuery {
  queryID: number;
  queryTitle: string;
  queryText: string;
  purpose: string;
  makeBy?: string;
  makeDate?: string;
}

/**
 * A single row returned by either endpoint (saved-query listing has
 * the fields above; the query-result endpoint returns whatever
 * columns the SQL produced). The grid builds its column list from
 * the first row's keys, so we keep the row shape permissive.
 */
export type SavedQueryResult = SavedQuery;
export type QueryResultRow = Record<string, string | number | boolean | null>;

/**
 * One transfer-type option for the Transfer Type dropdown. The demo
 * loads these from /TransactionOrBillService/GetAllTransactionOrBillServiceType
 * and filters by a fixed list of service IDs; for now we keep a small
 * static list so the UI is usable without the live endpoint.
 */
export interface TransferTypeOption {
  serviceId: string;
  serviceName: string;
}

/** Body shape for POST /QueryBuilder/SaveQuery. */
export interface SaveQueryPayload {
  QueryID: number;
  QueryTitle: string;
  QueryText: string;
  Purpose: string;
  MakeBy: string;
  MakeDate: string;
  LastUpdateBy: string;
  LastUpdateDate: string;
  LastAction: string;
}

/** Body shape for POST /QueryBuilder/GetDataByQuery. */
export interface GetDataByQueryPayload {
  QueryText: string;
}
