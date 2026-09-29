/**
 * notification / shared — model types.
 *
 * Mirrors the demo Vue `Notification.vue` with `isOldVersion = true`.
 * Field names are mixed-case on purpose (the CloudNetManagementAPI returns
 * them that way) so we can consume the response without remapping.
 */

/** Standard API envelope used by every CloudNetManagementAPI endpoint. */
export interface ApiResponse<T> {
  Status: 'OK' | 'UNAUTH' | string;
  Message: string;
  Result: T;
}

/**
 * Body for the only endpoint this old-version demo uses:
 *   POST /CombinedFeatures/CreateNotification
 *
 * Only the `ALL` broadcast flow is implemented (matches demo's
 * `isOldVersion = true` switch — the `INDIVIDUAL` and `MULTIPLE` branches
 * are intentionally not rendered).
 */
export interface CreateNotificationPayload {
  NotifiTitle: string;
  NotifiDesc: string;
  CustomerId: string;
}
