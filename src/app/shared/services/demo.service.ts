import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class DemoService {
  private baseUrl = 'http://localhost:8080/api/demo'; // Spring Boot backend

  constructor(private http: HttpClient) {}

  saveData(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/save`, payload);
  }
}
