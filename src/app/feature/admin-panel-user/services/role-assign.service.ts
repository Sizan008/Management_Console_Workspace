import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import {
  Injectable,
  inject,
} from '@angular/core';
import {
  forkJoin,
  map,
  Observable,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AssignRolesRequest } from '../models/role-assign.model';
import { ManagementConsoleApiResponse } from '../models/role-assign.model';
import { RoleAssignmentRoleDetail } from '../models/role-assign.model';
import { RoleAssignmentRole } from '../models/role-assign.model';
import { RoleAssignmentSearchResult } from '../models/role-assign.model';
import { RoleAssignmentUser } from '../models/role-assign.model';
type ApiRecord = Record<string, unknown>;
@Injectable({
  providedIn: 'root',
})
export class RoleAssignService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, "");
  searchUserAndLoadRoles(
    userId: string,
  ): Observable<RoleAssignmentSearchResult> {
    return forkJoin({
      user: this.getUserInformation(userId),
      allRoles: this.getAllRolesName(),
      existingRoles: this.getExistingRolesOfUser(
        userId,
      ),
    }).pipe(
      map((result) => {
        const existingRoleIdSet = new Set(
          result.existingRoles.map((role) => {
            return role.roleId;
          }),
        );
        const roleMap = new Map(
          result.allRoles.map((role) => {
            return [
              role.roleId,
              role,
            ];
          }),
        );
        const assignedRoles = result.existingRoles.map(
          (existingRole) => {
            const matchedRole = roleMap.get(
              existingRole.roleId,
            );
            return {
              roleId: existingRole.roleId,
              roleName:
                (existingRole.roleName !== existingRole.roleId ? existingRole.roleName : "") ||
                matchedRole?.roleName ||
                existingRole.roleId,
              roleDescription:
                existingRole.roleDescription ||
                matchedRole?.roleDescription ||
                '',
            };
          },
        );
        const unassignedRoles = result.allRoles.filter(
          (role) => {
            return !existingRoleIdSet.has(
              role.roleId,
            );
          },
        );
        return {
          user: result.user,
          unassignedRoles,
          assignedRoles,
        };
      }),
    );
  }
  private getUserInformation(
    userId: string,
  ): Observable<RoleAssignmentUser> {
    const params = new HttpParams()
      .set('UserID', userId)
      .set('customerId', '')
      .set('BranchID', '')
      .set('accountNo', '');
    return this.http
      .get<ManagementConsoleApiResponse<unknown>>(
        `${this.baseUrl}/api/UserManagement/GetUserInformation`,
        {
          params,
        },
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'User information could not be loaded.',
          );
          const result = this.asRecord(
            response.Result,
          );
          const registeredUser = this.asRecord(
            result?.['regCustUser'],
          );
          const customerInfo = this.asRecord(
            result?.['customerInfo'],
          );
          const resolvedUserId =
            this.firstText(
              registeredUser,
              [
                'userId',
                'UserID',
              ],
            ) || userId;
          if (resolvedUserId.toLowerCase() !== userId.toLowerCase()) {
            throw new Error('The returned user does not match the selected user.');
          }
          const userName = this.firstText(
            registeredUser,
            [
              'userNm',
              'userName',
              'UserName',
            ],
          );
          const customerId = this.firstText(
            customerInfo,
            [
              'customeR_ID',
              'customerId',
              'CustomerID',
            ],
          );
          if (!registeredUser || !Object.keys(registeredUser).length || !resolvedUserId) {
            throw new Error(
              'User ID was not returned by the server.',
            );
          }
          return {
            userId: resolvedUserId,
            userName,
            customerId,
          };
        }),
      );
  }
  private getAllRolesName(): Observable<
    RoleAssignmentRole[]
  > {
    return this.http
      .get<ManagementConsoleApiResponse<unknown>>(
        `${this.baseUrl}/api/RoleManagement/GetAllRolesName`,
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Role list could not be loaded.',
          );
          return this.toArray(response.Result)
            .map((item) => {
              const row = this.asRecord(item);
              const roleId = this.firstText(
                row,
                [
                  'roleId',
                  'RoleID',
                  'roleID',
                ],
              );
              return {
                roleId,
                roleName:
                  this.firstText(
                    row,
                    [
                      'roleName',
                      'RoleName',
                    ],
                  ) || roleId,
                roleDescription: this.firstText(
                  row,
                  [
                    'description',
                    'Description',
                    'roleDescription',
                    'RoleDescription',
                  ],
                ),
              };
            })
            .filter((role) => {
              return Boolean(role.roleId);
            });
        }),
      );
  }
  private getExistingRolesOfUser(
    userId: string,
  ): Observable<RoleAssignmentRole[]> {
    const params = new HttpParams()
      .set('UserID', userId);
    return this.http
      .get<ManagementConsoleApiResponse<unknown>>(
        `${this.baseUrl}/api/RoleManagement/GetExistingRolesOfUser`,
        {
          params,
        },
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Existing user roles could not be loaded.',
          );
          return this.toArray(response.Result)
            .map((item) => {
              const row = this.asRecord(item);
              const roleId = this.firstText(
                row,
                [
                  'roleId',
                  'RoleID',
                  'roleID',
                ],
              );
              return {
                roleId,
                roleName:
                  this.firstText(
                    row,
                    [
                      'roleName',
                      'RoleName',
                    ],
                  ) || roleId,
                roleDescription: this.firstText(
                  row,
                  [
                    'description',
                    'Description',
                    'roleDescription',
                    'RoleDescription',
                  ],
                ),
              };
            })
            .filter((role) => {
              return Boolean(role.roleId);
            });
        }),
      );
  }
  getRoleDetails(
    roleId: string,
  ): Observable<RoleAssignmentRoleDetail[]> {
    const params = new HttpParams()
      .set('RoleID', roleId);
    return this.http
      .get<ManagementConsoleApiResponse<unknown>>(
        `${this.baseUrl}/api/RoleManagement/GetRoleDetails`,
        {
          params,
        },
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Role details could not be loaded.',
          );
          return this.toArray(response.Result)
            .map((item) => {
              const row = this.asRecord(item);
              const resolvedRoleId = this.firstText(
                row,
                [
                  'roleId',
                  'RoleID',
                  'roleID',
                ],
              );
              return {
                roleId: resolvedRoleId,
                roleName:
                  this.firstText(
                    row,
                    [
                      'roleName',
                      'RoleName',
                    ],
                  ) || resolvedRoleId,
                roleDescription: this.firstText(
                  row,
                  [
                    'roleDescription',
                    'RoleDescription',
                    'description',
                    'Description',
                  ],
                ),
                methodId: this.firstText(
                  row,
                  [
                    'methodId',
                    'MethodID',
                    'methodID',
                  ],
                ),
                methodDescription: this.firstText(
                  row,
                  [
                    'methodDescription',
                    'MethodDescription',
                    'methodDesc',
                    'MethodDesc',
                  ],
                ),
              };
            })
            .filter((row) => {
              return Boolean(row.methodId);
            });
        }),
      );
  }
  assignRoles(
    payload: AssignRolesRequest,
  ): Observable<string> {
    return this.http
      .post<ManagementConsoleApiResponse<unknown>>(
        `${this.baseUrl}/api/Request/AssaignRoles`,
        payload,
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Role assignment request failed.',
          );
          return this.meaningfulMessage(
            response.Message,
            'Role assignment request submitted successfully.',
          );
        }),
      );
  }
  private throwIfApiFailed<T>(
    response: ManagementConsoleApiResponse<T>,
    fallbackMessage: string,
  ): void {
    const status = this.text(
      response?.Status,
    ).toUpperCase();
    if (status === 'OK') {
      return;
    }
    throw new Error(
      this.meaningfulMessage(
        response?.Message,
        fallbackMessage,
      ),
    );
  }
  private meaningfulMessage(
    value: unknown,
    fallbackMessage: string,
  ): string {
    const message = this.text(value);
    const meaningfulText = message.replace(
      /[\s,.;:!?]+/g,
      '',
    );
    return meaningfulText
      ? message
      : fallbackMessage;
  }
  private asRecord(
    value: unknown,
  ): ApiRecord | null {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return value as ApiRecord;
    }
    return null;
  }
  private toArray(
    value: unknown,
  ): unknown[] {
    return Array.isArray(value)
      ? value
      : [];
  }
  private firstText(
    source: ApiRecord | null,
    keys: string[],
  ): string {
    if (!source) {
      return '';
    }
    for (const key of keys) {
      const value = this.text(
        source[key],
      );
      if (value) {
        return value;
      }
    }
    return '';
  }
  private text(
    value: unknown,
  ): string {
    if (
      value === undefined ||
      value === null
    ) {
      return '';
    }
    return String(value).trim();
  }
}
