import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DashboardColumn,
  GlobalResponse,
  UserDashboardInitialData,
  UserDashboardKpiResponse,
  UserDashboardRow,
  UserDashboardUserInformation,
} from '../models/user-dashboad.model';
import { UserDashboardSearchCriteria } from '../models/user-dashboard-search.model';
import {
  USER_DASHBOARD_INITIAL_KPIS,
  UserDashboardKpi,
} from '../models/user-dashboard-kpi.model';
type ApiRecord = Record<string, unknown>;
@Injectable({
  providedIn: 'root',
})
export class AdminPanelUserDashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');
  loadInitialDashboardData(
    criteria: UserDashboardSearchCriteria,
  ): Observable<UserDashboardInitialData> {
    const kpiRequests = USER_DASHBOARD_INITIAL_KPIS.map((pKPI) =>
      this.getUserDashboardDetails(pKPI, criteria).pipe(
        catchError((error) =>
          of<UserDashboardKpiResponse>({
            pKPI,
            rows: [],
            error: this.getErrorMessage(
              error,
              `Dashboard KPI ${pKPI} could not be loaded.`,
            ),
          }),
        ),
      ),
    );
    const userInformationRequest = this.findUserInformation(criteria).pipe(
      map((data) => ({
        data,
        error: '',
      })),
      catchError((error) =>
        of({
          data: {} as UserDashboardUserInformation,
          error: this.getErrorMessage(
            error,
            'User information could not be loaded.',
          ),
        }),
      ),
    );
    return forkJoin({
      userInformationResult: userInformationRequest,
      kpiResponses: forkJoin(kpiRequests),
    }).pipe(
      map((result) => {
        const warnings: string[] = [];
        if (result.userInformationResult.error) {
          warnings.push(result.userInformationResult.error);
        }
        result.kpiResponses.forEach((response) => {
          if (response.error) {
            warnings.push(response.error);
          }
        });
        return {
          userInformation: result.userInformationResult.data,
          kpiResponses: result.kpiResponses,
          warnings,
        };
      }),
    );
  }
  loadTodayTransactionByStatus(
    criteria: UserDashboardSearchCriteria,
    isSuccessful: boolean,
  ): Observable<UserDashboardKpiResponse> {
    const pKPI: UserDashboardKpi = isSuccessful ? 2 : 3;
    return this.getUserDashboardDetails(pKPI, criteria);
  }
  getUserDashboardDetails(
    pKPI: UserDashboardKpi,
    criteria: UserDashboardSearchCriteria,
  ): Observable<UserDashboardKpiResponse> {
    const params = new HttpParams()
      .set('pKPI', String(pKPI))
      .set('pDATE_FROM', criteria.fromDate)
      .set('pDATE_UPTO', criteria.toDate)
      .set('pUSER_ID', criteria.userId)
      .set('pSEARCH_FLAG', String(criteria.searchFlag))
      .set('pMOBILE_NO', criteria.mobileNumber)
      .set('pCUSTOMER_ID', criteria.customerId);
    return this.http
      .get<
        GlobalResponse<unknown>
      >(`${this.baseUrl}/api/Dashboard/GetUserDashboardDetails`, { params })
      .pipe(
        map((response) => {
          this.validateResponse(
            response,
            `Dashboard KPI ${pKPI} could not be loaded.`,
          );
          return {
            pKPI,
            rows: this.mapKpiRows(pKPI, response.Result),
          };
        }),
      );
  }
  findUserInformation(
    criteria: UserDashboardSearchCriteria,
  ): Observable<UserDashboardUserInformation> {
    const params = new HttpParams()
      .set('searchFlag', String(criteria.searchFlag))
      .set('userId', criteria.userId)
      .set('customerId', criteria.customerId)
      .set('mobileNumber', criteria.mobileNumber)
      .set('email', criteria.email);
    return this.http
      .get<
        GlobalResponse<unknown>
      >(`${this.baseUrl}/api/UserManagement/FindUserInformation`, { params })
      .pipe(
        map((response) => {
          this.validateResponse(
            response,
            'User information could not be loaded.',
          );
          return this.normalizeUserInformation(response.Result);
        }),
      );
  }
  private mapKpiRows(
    pKPI: UserDashboardKpi,
    value: unknown,
  ): UserDashboardRow[] {
    const rows = this.toRows(value);
    switch (pKPI) {
      case 2:
      case 3:
        return this.mapRows(
          rows,
          [
            { key: 'logId', aliases: ['logId', 'log_id', 'LOG_ID'] },
            {
              key: 'type',
              aliases: [
                'type',
                'transactionType',
                'transaction_type',
                'transferType',
                'TRANSFER_TYPE',
                'transfeR_TYPE',
                'transferFor',
                'TRANSFER_FOR',
                'transfeR_FOR',
              ],
            },
            {
              key: 'userId',
              aliases: ['userId', 'user_id', 'USER_ID', 'useR_ID'],
            },
            {
              key: 'date',
              aliases: [
                'date',
                'transactionDate',
                'tranDate',
                'transaction_date',
                'transDate',
                'TRANS_DATE',
                'tranS_DATE',
              ],
            },
            {
              key: 'transactionId',
              aliases: [
                'transactionId',
                'transaction_id',
                'tranId',
                'tran_id',
                'transferId',
                'TRANSFER_ID',
                'transfeR_ID',
              ],
            },
            {
              key: 'customerId',
              aliases: [
                'customerId',
                'customer_id',
                'CUSTOMER_ID',
                'customeR_ID',
              ],
            },
            {
              key: 'sourceBranch',
              aliases: [
                'sourceBranch',
                'source_br',
                'sourceBranchId',
                'fromBranchId',
                'FROM_BRANCH_ID',
                'froM_BRANCH_ID',
              ],
            },
            {
              key: 'sourceAccount',
              aliases: [
                'sourceAccount',
                'source_ac',
                'sourceAccountNo',
                'fromAccountNo',
                'FROM_ACCOUNT_NO',
                'froM_ACCOUNT_NO',
              ],
            },
            {
              key: 'destinationBranch',
              aliases: [
                'destinationBranch',
                'destBranch',
                'dest_br',
                'toBranchId',
                'TO_BRANCH_ID',
                'tO_BRANCH_ID',
              ],
            },
            {
              key: 'destinationAccount',
              aliases: [
                'destinationAccount',
                'destAccount',
                'dest_ac',
                'toAccountNo',
                'TO_ACCOUNT_NO',
                'tO_ACCOUNT_NO',
              ],
            },
            {
              key: 'receiver',
              aliases: ['receiver', 'receiverName', 'RECEIVER_NAME'],
            },
            {
              key: 'amount',
              aliases: [
                'amount',
                'transactionAmount',
                'transAmount',
                'TRANS_AMOUNT',
                'tranS_AMOUNT',
              ],
            },
          ],
          'transaction',
        );
      case 4:
        return this.mapRows(
          rows,
          [
            {
              key: 'branch',
              aliases: [
                'branch',
                'branchId',
                'branch_id',
                'BRANCH_ID',
                'brancH_ID',
              ],
            },
            {
              key: 'accountNo',
              aliases: [
                'accountNo',
                'accountNumber',
                'account_number',
                'ACCOUNT_NO',
                'accounT_NO',
              ],
            },
            {
              key: 'title',
              aliases: [
                'title',
                'accountTitle',
                'ACCOUNT_TITLE',
                'accounT_TITLE',
              ],
            },
            {
              key: 'product',
              aliases: [
                'product',
                'productName',
                'PRODUCT_NAME',
                'producT_NAME',
              ],
            },
            {
              key: 'payeeBranch',
              aliases: [
                'payeeBranch',
                'payee_branch',
                'payeeBranchId',
                'PAYEE_BRANCH_ID',
                'payeE_BRANCH_ID',
              ],
            },
            {
              key: 'payeeAccount',
              aliases: [
                'payeeAccount',
                'payee_account',
                'payeeAccountNo',
                'PAYEE_ACCOUNT_NO',
                'payeE_ACCOUNT_NO',
              ],
            },
            {
              key: 'date',
              aliases: [
                'date',
                'openDate',
                'createdDate',
                'OPEN_DATE',
                'opeN_DATE',
                'CREATED_DATE',
                'createD_DATE',
              ],
            },
          ],
          'fdr-dps',
        );
      case 5:
        return this.mapRows(
          rows,
          [
            {
              key: 'type',
              aliases: [
                'type',
                'requestType',
                'REQUEST_TYPE',
                'requesT_TYPE',
                'reqType',
                'REQ_TYPE',
              ],
            },
            {
              key: 'branch',
              aliases: ['branch', 'branchId', 'BRANCH_ID', 'brancH_ID'],
            },
            {
              key: 'accountNo',
              aliases: [
                'accountNo',
                'accountNumber',
                'ACCOUNT_NO',
                'accounT_NO',
              ],
            },
            {
              key: 'details',
              aliases: [
                'details',
                'description',
                'requestDetails',
                'REQUEST_DETAILS',
                'requesT_DETAILS',
              ],
            },
            {
              key: 'status',
              aliases: [
                'status',
                'requestStatus',
                'REQUEST_STATUS',
                'requesT_STATUS',
              ],
            },
          ],
          'request',
        );
      case 6:
        return this.mapRows(
          rows,
          [
            {
              key: 'deviceType',
              aliases: [
                'deviceType',
                'device_type',
                'DEVICE_TYPE',
                'devicE_TYPE',
              ],
            },
            {
              key: 'deviceToken',
              aliases: [
                'deviceToken',
                'device_token',
                'DEVICE_TOKEN',
                'devicE_TOKEN',
              ],
            },
          ],
          'device',
        );
      case 7:
        return this.mapRows(
          rows,
          [
            {
              key: 'date',
              aliases: [
                'date',
                'activityDate',
                'createdDate',
                'activityDt',
                'ACTIVITY_DT',
                'activitY_DT',
              ],
            },
            {
              key: 'details',
              aliases: [
                'details',
                'description',
                'activityDetails',
                'ACTIVITY_DETAILS',
                'activitY_DETAILS',
              ],
            },
            {
              key: 'from',
              aliases: [
                'from',
                'source',
                'location',
                'requestFrom',
                'REQUEST_FROM',
                'requesT_FROM',
              ],
            },
            {
              key: 'ipImei',
              aliases: ['ipImei', 'ip_imei', 'imei', 'ipAddress', 'IP_IMEI'],
            },
          ],
          'activity',
        );
      case 8:
        return this.mapRows(
          rows,
          [
            {
              key: 'date',
              aliases: [
                'date',
                'changeDate',
                'createdDate',
                'passwordChangedOn',
                'PASSWORD_CHANGED_ON',
                'passworD_CHANGED_ON',
                'lastPasswordChangedOn',
                'LAST_PASSWORD_CHANGED_ON',
              ],
            },
            {
              key: 'totalChange',
              aliases: [
                'totalChange',
                'totalPasswordChange',
                'total_password_change',
                'passwordChangedCount',
                'PASSWORD_CHANGED_COUNT',
                'passwordChangeCount',
                'PASSWORD_CHANGE_COUNT',
                'totalPasswordChanged',
                'TOTAL_PASSWORD_CHANGED',
              ],
            },
          ],
          'password',
        );
      default:
        return rows;
    }
  }
  private mapRows(
    rows: UserDashboardRow[],
    columns: DashboardColumn[],
    prefix: string,
  ): UserDashboardRow[] {
    return rows
      .map((row, index) => {
        const source = this.toRecord(row);
        const mappedRow: UserDashboardRow = {
          rowId: `${prefix}-${index + 1}`,
        };
        columns.forEach((column) => {
          mappedRow[column.key] = this.readText(source, column.aliases);
        });
        return mappedRow;
      })
      .filter((row) => {
        return Object.entries(row).some(([key, value]) => {
          if (key === 'rowId') return false;
          return this.text(value).length > 0;
        });
      });
  }
  private normalizeUserInformation(
    value: unknown,
  ): UserDashboardUserInformation {
    const root = this.toRecord(value);
    const regUser = this.getNestedRecord(root, ['regCustUser', 'RegCustUser']);
    const customerInfo = this.getNestedRecord(root, [
      'customerInfo',
      'CustomerInfo',
    ]);
    const accounts = this.getNestedRecords(root, ['accounts', 'Accounts'])
      .map((account) => ({
        branchId: this.readText(account, [
          'branchId',
          'branch_id',
          'BRANCH_ID',
          'brancH_ID',
        ]),
        accountNumber: this.readText(account, [
          'accountNumber',
          'accountNo',
          'account_number',
          'ACCOUNT_NUMBER',
          'accounT_NUMBER',
        ]),
      }))
      .filter((account) => !!account.branchId || !!account.accountNumber);
    const addresses = this.getNestedRecords(root, [
      'customerFullAddresses',
      'CustomerFullAddresses',
      'addresses',
      'Addresses',
    ])
      .map((address) => ({
        addressType: this.readText(address, [
          'addressType',
          'ADDRESS_TYPE',
          'addresS_TYPE',
        ]),
        address1: this.readText(address, [
          'address1',
          'ADDRESS_1',
          'addresS_1',
        ]),
        address2: this.readText(address, [
          'address2',
          'ADDRESS_2',
          'addresS_2',
        ]),
        city: this.readText(address, ['city', 'CITY']),
        district: this.readText(address, [
          'district',
          'DISTRICT',
          'districtName',
          'DISTRICT_NAME',
        ]),
        division: this.readText(address, [
          'division',
          'DIVISION',
          'divisionName',
          'DIVISION_NAME',
        ]),
        phone: this.readText(address, [
          'phone',
          'PHONE',
          'phoneNumber',
          'PHONE_NUMBER',
        ]),
        mobile: this.readText(address, [
          'mobile',
          'MOBILE',
          'mobileNumber',
          'MOBILE_NUMBER',
        ]),
        email: this.readText(address, [
          'email',
          'EMAIL',
          'emailAddress',
          'EMAIL_ADDRESS',
        ]),
      }))
      .filter((address) => Object.values(address).some((value) => !!value));
    return {
      ...root,
      regCustUser: {
        userId:
          this.readText(regUser, ['userId', 'USER_ID', 'useR_ID']) || undefined,
        customerId:
          this.readText(regUser, [
            'customerId',
            'CUSTOMER_ID',
            'customeR_ID',
          ]) || undefined,
        userNm:
          this.readText(regUser, [
            'userNm',
            'USER_NM',
            'useR_NM',
            'userName',
          ]) || undefined,
        emailAddress:
          this.readText(regUser, [
            'emailAddress',
            'EMAIL_ADDRESS',
            'emaiL_ADDRESS',
            'email',
          ]) || undefined,
        mobileNumber:
          this.readText(regUser, [
            'mobileNumber',
            'MOBILE_NUMBER',
            'mobilE_NUMBER',
            'mobile',
          ]) || undefined,
        authenticationTypeId:
          this.readText(regUser, [
            'authenticationTypeId',
            'AUTHENTICATION_TYPE_ID',
          ]) || undefined,
        authStatusId:
          this.readText(regUser, ['authStatusId', 'AUTH_STATUS_ID']) ||
          undefined,
        userStatusActiveFlag: this.readBoolean(regUser, [
          'userStatusActiveFlag',
          'USER_STATUS_ACTIVE_FLAG',
        ]),
        lockedFlag: this.readBoolean(regUser, ['lockedFlag', 'LOCKED_FLAG']),
      },
      customerInfo: {
        homE_BRANCH_ID:
          this.readText(customerInfo, [
            'homE_BRANCH_ID',
            'HOME_BRANCH_ID',
            'homeBranchId',
          ]) || undefined,
        customeR_TYPE_NM:
          this.readText(customerInfo, [
            'customeR_TYPE_NM',
            'CUSTOMER_TYPE_NM',
            'customerTypeName',
          ]) || undefined,
        birtH_DATE:
          this.readText(customerInfo, [
            'birtH_DATE',
            'BIRTH_DATE',
            'birthDate',
          ]) || undefined,
        fatheR_NM:
          this.readText(customerInfo, [
            'fatheR_NM',
            'FATHER_NM',
            'fatherName',
          ]) || undefined,
        motheR_NM:
          this.readText(customerInfo, [
            'motheR_NM',
            'MOTHER_NM',
            'motherName',
          ]) || undefined,
      },
      accounts,
      customerFullAddresses: addresses,
    };
  }
  private validateResponse<T>(
    response: GlobalResponse<T>,
    fallback: string,
  ): void {
    const status = this.text(response?.Status).toUpperCase();
    if (status === 'OK') return;
    throw new Error(this.text(response?.Message) || fallback);
  }
  private toRows(value: unknown): UserDashboardRow[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item),
    ) as UserDashboardRow[];
  }
  private getNestedRecord(source: ApiRecord, aliases: string[]): ApiRecord {
    return this.toRecord(this.readRawValue(source, aliases));
  }
  private getNestedRecords(source: ApiRecord, aliases: string[]): ApiRecord[] {
    const value = this.readRawValue(source, aliases);
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => this.toRecord(item))
      .filter((item) => Object.keys(item).length > 0);
  }
  private readText(source: ApiRecord, aliases: string[]): string {
    return this.text(this.readRawValue(source, aliases));
  }
  private readBoolean(
    source: ApiRecord,
    aliases: string[],
  ): boolean | undefined {
    const value = this.readRawValue(source, aliases);
    if (value === undefined || value === null) return undefined;
    if (value === true || value === false) return value;
    const normalized = this.text(value).toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return undefined;
  }
  private readRawValue(source: ApiRecord, aliases: string[]): unknown {
    const normalizedAliases = aliases.map((alias) => this.normalizeKey(alias));
    for (const key of Object.keys(source)) {
      if (normalizedAliases.includes(this.normalizeKey(key))) {
        return source[key];
      }
    }
    return undefined;
  }
  private normalizeKey(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  private toRecord(value: unknown): ApiRecord {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as ApiRecord;
    }
    return {};
  }
  private text(value: unknown): string {
    if (value === undefined || value === null) return '';
    const result = String(value).trim();
    if (!result || result.toLowerCase() === 'null') return '';
    return result;
  }
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    const record = this.toRecord(error);
    const directMessage = this.text(record['message'] ?? record['Message']);
    if (directMessage) return directMessage;
    const backendError = this.toRecord(record['error']);
    const backendMessage = this.text(
      backendError['message'] ?? backendError['Message'],
    );
    return backendMessage || fallback;
  }
}
