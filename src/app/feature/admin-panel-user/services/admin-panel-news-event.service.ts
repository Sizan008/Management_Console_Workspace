import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';

import {
  GlobalResponse,
  NewsPayload
} from '../models/news-event.model';


@Injectable({
  providedIn:'root'
})
export class AdminPanelNewsEventService {


  private readonly http =
    inject(HttpClient);


  private readonly baseUrl =
    environment.mcUrl.replace(
      /\/+$/,
      ''
    );



  getNewsEventList():
    Observable<GlobalResponse> {


    return this.http.get<GlobalResponse>(

      `${this.baseUrl}/api/CombinedFeatures/GetNewsEventsList`

    );

  }


  addUpdateOrDeleteNewsEvent(
    payload:NewsPayload
  ):
    Observable<GlobalResponse>{


    return this.http.post<GlobalResponse>(

      `${this.baseUrl}/api/CombinedFeatures/AddOrEditOrDeleteNewsEvents`,

      payload

    );

  }


}