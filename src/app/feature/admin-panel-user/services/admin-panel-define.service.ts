import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GlobalResponse<T = unknown> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface RoleAccessMethod {
  methodId: string;
  description: string;
}

export interface RoleListItem {
  roleId: string;
  description: string;
}

export interface RoleDetail {
  roleId: string;
  roleName: string;
  roleDescription: string;
  methodId: string;
}

export interface RoleAddOrUpdateRequest {
  RoleID: string;
  RoleName: string;
  RoleDescription: string;
  MethodID: string[];
}

type ApiRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class AdminPanelDefineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  getAccessMethods(): Observable<RoleAccessMethod[]> {
    return this.http
      .get<
        GlobalResponse<unknown>
      >(`${this.baseUrl}/api/RoleManagement/GetAccessMethod`)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Access method list could not be loaded.',
          );

          return this.toArray(response.Result)
            .map((item) => {
              const row = this.asRecord(item);

              return {
                methodId: this.firstText(row, [
                  'methodId',
                  'MethodID',
                  'methodID',
                ]),
                description: this.firstText(row, [
                  'description',
                  'Description',
                  'methodDescription',
                  'MethodDescription',
                ]),
              };
            })
            .filter((item) => Boolean(item.methodId));
        }),
      );
  }

  getAllRoleNames(): Observable<RoleListItem[]> {
    return this.http
      .get<
        GlobalResponse<unknown>
      >(`${this.baseUrl}/api/RoleManagement/GetAllRolesName`)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Role list could not be loaded.');

          return this.toArray(response.Result)
            .map((item) => {
              const row = this.asRecord(item);

              return {
                roleId: this.firstText(row, ['roleId', 'RoleID', 'roleID']),
                description: this.firstText(row, [
                  'description',
                  'Description',
                  'roleDescription',
                  'RoleDescription',
                ]),
              };
            })
            .filter((item) => Boolean(item.roleId));
        }),
      );
  }

  getRoleDetails(roleId: string): Observable<RoleDetail[]> {
    const params = new HttpParams().set('RoleID', roleId);

    return this.http
      .get<
        GlobalResponse<unknown>
      >(`${this.baseUrl}/api/RoleManagement/GetRoleDetails`, { params })
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Role details could not be loaded.');

          return this.toArray(response.Result)
            .map((item) => {
              const row = this.asRecord(item);

              const resolvedRoleId = this.firstText(row, [
                'roleId',
                'RoleID',
                'roleID',
              ]);

              return {
                roleId: resolvedRoleId,
                roleName:
                  this.firstText(row, ['roleName', 'RoleName']) ||
                  resolvedRoleId,
                roleDescription: this.firstText(row, [
                  'roleDescription',
                  'RoleDescription',
                  'description',
                  'Description',
                ]),
                methodId: this.firstText(row, [
                  'methodId',
                  'MethodID',
                  'methodID',
                ]),
              };
            })
            .filter((item) => Boolean(item.methodId));
        }),
      );
  }

  saveOrUpdateRole(payload: RoleAddOrUpdateRequest): Observable<string> {
    return this.http
      .post<
        GlobalResponse<unknown>
      >(`${this.baseUrl}/api/Request/RoleAddOrUpdate`, payload)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Role add or update request failed.');

          return this.meaningfulMessage(
            response.Message,
            'Successfully requested. Authorization is pending.',
          );
        }),
      );
  }

  private throwIfApiFailed<T>(
    response: GlobalResponse<T>,
    fallbackMessage: string,
  ): void {
    const status = this.text(response?.Status).toUpperCase();

    if (status === 'OK') {
      return;
    }

    throw new Error(this.meaningfulMessage(response?.Message, fallbackMessage));
  }

  private meaningfulMessage(value: unknown, fallbackMessage: string): string {
    const message = this.text(value);

    return message.replace(/[\s,.;:!?]+/g, '') ? message : fallbackMessage;
  }

  private asRecord(value: unknown): ApiRecord | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as ApiRecord;
    }

    return null;
  }

  private toArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private firstText(source: ApiRecord | null, keys: string[]): string {
    if (!source) {
      return '';
    }

    for (const key of keys) {
      const value = this.text(source[key]);

      if (value) {
        return value;
      }
    }

    return '';
  }

  private text(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }
}
