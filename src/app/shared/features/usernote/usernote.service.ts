import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IUserNote } from './usernote.model';
import { environment } from '../../../../environments/environment';


@Injectable({
    providedIn: 'root',
})
export class UserNoteService {
    constructor(
        private http: HttpClient
    ) { }

    getUserNoteByNoteId(
        noteId: string
    ): Observable<IUserNote> {
        var reqHeader = new HttpHeaders({
            'Content-Type': 'application/json',
        });

        return this.http.get<IUserNote>(
            `${environment.centrinoUrl}/UserNote/RetrieveUserNoteByNoteId/${noteId}`,
            { headers: reqHeader }
        );
    }

    getUserNoteByUserId(
        userId: string
    ): Observable<IUserNote[]> {
        var reqHeader = new HttpHeaders({
            'Content-Type': 'application/json',
        });

        // return this.cacheService.cacheRequest("UserAccountListBY" + accountType, () => {
        return this.http.get<IUserNote[]>(
            `${environment.centrinoUrl}/UserNote/RetrieveUserNotesByUserId/${userId}`,
            { headers: reqHeader }
        );
        // });
    }

    manageUserNote(
        userNoteParam: IUserNote
    ): Observable<IUserNote> {
        let reqHeader = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.post<IUserNote>(
            `${environment.centrinoUrl}/UserNote/RegisterUserNote`,
            userNoteParam,
            { headers: reqHeader }
        );
    }

    deleteUserNote(noteId: string
    ): Observable<IUserNote> {
        let reqHeader = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.delete<IUserNote>(
            `${environment.centrinoUrl}/UserNote/DeleteUserNote/${noteId}`,
            { headers: reqHeader }
        );
    }
}
