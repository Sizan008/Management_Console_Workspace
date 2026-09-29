import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import {  Observable} from "rxjs";
import { ApprovalRequest } from "../models/approval";
import { environment } from "../../../environments/environment";
@Injectable({
  providedIn: 'root'   // <-- makes the service available app-wide
})
export class ApprovalService {
  constructor(private http: HttpClient) { }

  getUnApprovedList(userId : string): Observable<any> {
    console.log('in service : ', userId);
    var url = `${environment.sentinelUrl}/ApprovalRegister/RetrievePendingApprovalRegistersByUserId/${userId}`;
    return this.http.get<any>(url);
  }

  getAllApprovedList(userId : string): Observable<any> {
    var url = `${environment.sentinelUrl}/ApprovalRegister/RetrieveRegisteredApprovalRegistersByUserId/${userId}`;
    return this.http.get<any>(url);
  }

  getApprovalQueue(setId: number): Observable<any> {
    var url = `${environment.sentinelUrl}/ApprovalRegister/RetrieveApprovalQueueBySetId/${setId}`;
    return this.http.get<any>(url);
  }

  performApprovalOperation(req: ApprovalRequest): Observable<any> {
    // Remarks ride along as a URL path segment, so they must be encoded — an
    // unescaped '/' or '#' would break the segment layout. An empty remark would
    // collapse the path into '//' and shift every later segment, so send '-'.
    const remarks = encodeURIComponent(req.remarks?.trim() || '-');
    const url = `${environment.sentinelUrl}/ApprovalRegister/ExecuteApprovalOperation/${req.officeId}/${req.appId }/${req.setId}/${req.approvalLevel}/${req.nextApprovalLevel}/${remarks}/${req.userId}/${req.approvalFlag}`;

    return this.http.get(url, { responseType: 'text' });
  }
}
