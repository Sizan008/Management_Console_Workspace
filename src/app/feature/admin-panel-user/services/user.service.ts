import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { User, UserApiResponse, authStatusToStage, branchDisplayName, rolesToString } from '../models/user.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.myBaseUrl2}/api`;

  getUserList(): Observable<User[]> {
    return this.http
      .get<UserApiResponse>(`${this.base}/UserList/getUserList`)
      .pipe(map(res => res?.Result ?? []));
  }

  getUserListViewModel(): Observable<User[]> {
    return this.getUserList().pipe(
      map(users => users.map(u => ({
        ...u,
        homeBranchName: branchDisplayName(u),
        roles: u.roles ?? [],
      })))
    );
  }

  rolesToString(roles: User['roles']): string {
    return rolesToString(roles);
  }

  authStatusToStage(authStatus: string | null | undefined): string {
    return authStatusToStage(authStatus);
  }
}
