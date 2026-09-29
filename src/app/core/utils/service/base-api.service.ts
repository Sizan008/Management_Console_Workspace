import {HttpClient} from '@angular/common/http';
import {Inject, Injectable, InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {CommonResponseList, CommonResponseObject, CommonResponsePageable,} from '../model/common-response';

@Injectable({
    providedIn: 'root',
})
export class BaseApiService<I> {

    protected constructor(
        protected httpClient: HttpClient,
        @Inject(new InjectionToken<string>('_BASE_URL')) protected _BASE_URL: string
    ) {}

    create(i: I): Observable<CommonResponseObject<I>> {
        return this.httpClient.post<CommonResponseObject<I>>(this._BASE_URL, i);
    }

    update(i: I): Observable<CommonResponseObject<I>> {
        return this.httpClient.put<CommonResponseObject<I>>(this._BASE_URL, i);
    }

    delete(uuid: any): Observable<CommonResponseObject<I>> {
        return this.httpClient.delete<CommonResponseObject<I>>(this._BASE_URL + '/' + uuid);
    }

    getByUuid(uuid: string): Observable<CommonResponseObject<I>> {
        return this.httpClient.get<CommonResponseObject<I>>(
            this._BASE_URL + '/' + uuid
        );
    }

    getById(id: number): Observable<CommonResponseObject<I>> {
        return this.httpClient.get<CommonResponseObject<I>>(
            this._BASE_URL + '/get-by-id/' + id
        );
    }

    getList(): Observable<CommonResponseList<I>> {
        return this.httpClient.get<CommonResponseList<I>>(this._BASE_URL);
    }

    getListWithPagination(page: number, size: number): Observable<CommonResponsePageable<I>> {
        return this.httpClient.get<CommonResponsePageable<I>>(
            this._BASE_URL + '/' + page + '/' + size
        );
    }

    getByIdSet(ids:any): Observable<CommonResponseList<any>> {
        return this.httpClient.post<CommonResponseList<any>>(this._BASE_URL + '/ids', ids);
    }

    getByLikeNameEn(name:any): Observable<CommonResponseList<I>> {
        return this.httpClient.get<CommonResponseList<I>>(this._BASE_URL + '/get-by-like-name/' + name);
    }

}
