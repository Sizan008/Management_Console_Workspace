import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  logEvent(eventType: string, functionId?: string, extra?: any) {
    const payload = {
      eventType,
      functionId: functionId || localStorage.getItem('currentFunctionId'),
      timestamp: new Date(),
      extra
    };
    console.log('Activity Log:', payload);

  }
}
