import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtPayload, jwtDecode } from "jwt-decode";
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NovuService } from '../../../shared/services/novu.service';


export interface UserAccessItem {
  functionId: string;
  functionName: string;
  HOFunctionFlag: string;
  AllowMaintAddFlag: string;
  AllowMaintEditFlag: string;
  AllowMaintDelFlag: string;
  AllowMaintViewFlag: string;
  AllowMaintAuthFlag: string;
  AllowProcessFlag: string;
  AllowReportViewFlag: string;
  AllowReportPrintFlag: string;
  AllowReportGenFlag: string;
  AllowAnyOfficeOpsFlag: string;
  moduleId: string;
  moduleName: string;
  appRoute: string;
  itemType: string;
  quickRouteNo: string;
  IsFinancial: string;
}
export interface UserAppAccessList {
  id:number,
  uuid:string,
  appId:number,
  appName:string,
  appDesc:string
}

export interface UserDataResponse {
  userAccessList: UserAccessItem[];
  appAccessList: UserAppAccessList[];
  userProfile: UserProfileModel;
}

export interface UserProfileModel {
  userId : string;
  userName : string;
  userDescription : string;
  homeOfficeId? : number;
  mobileNumber : string;
  userEmailId : string;
  loginId : string;
  passwordString : string;
  lastPasswordChangedOn : Date;
  forcePasswordChangedFlag : boolean;
  smsAdminRoleFlag : boolean;
  sysAdminRoleFlag : boolean;
  builtInUserFlag : boolean;
  officeManagerFlag : boolean;
  employeeId : number;
  userStatusActiveFlag : number;
  userStatusChangedOn : Date;
  userStatusChangeReason : string;
  userProfileClosedFlag : number;
  userProfileClosedOn : Date;
  userProfileChangeReason : string;
  failedLoginAttemptsNos : number;
  activationLink : string;
  activationExpiredOn : Date;
  activationLinkStatus : string;
  logInAppTerminalIp : string;
  logInUserTerminalIp : string;
  appLogInTime : string;
  appLogOutTime : string;
  sessionExpTime : number;
  macAddress : string;
  approveFlag : boolean;
  userImg : string;

  employeeCode : string;

  //additional for loginInfo
  terminalIp : string;
  browser : string;
  sessionId : string;
  sessionTerminalIp : string;
  loginAt : string;
  appId : number;
  clientPCName : string;

  //additional for forgetPassword Info
  remarks : string;

  mregUserGrantPackageRequestList : UserGrantPackageModel[];
}
export interface UserGrantPackageModel {
  userId : string;
  packageId : number;
  approveFlag : number;
  tmpDt : Date;
  isDeleted : number;
}
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
  ],
  templateUrl: './login.html',
  standalone: true,
  styleUrl: './login.scss'
})
export class Login implements OnInit {

  http = inject(HttpClient);
  fb = inject(FormBuilder);
  router = inject(Router);
  private novuService = inject(NovuService);
  private readonly notifyBaseUrl = environment.apiBaseUrl;
  frmGroup: FormGroup;
  loginError: boolean = false;
  coreBaseUrl: string = environment.apiBaseUrl;
  terminalIp: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  userDataResponse: UserDataResponse[] = [];
  error: string | null = null;
  userAccessList: UserAccessItem[] = [];
  tokenObject: any;
  ngOnInit(): void {
    this.frmGroup = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });

    // Get IP address when component initializes
    this.getClientIP();
  }

  // Get client IP using external service
  getClientIP(): void {
    this.http.get<any>('https://api.ipify.org?format=json').subscribe({
      next: (response) => {
        this.terminalIp = response.ip;
        console.log('Client IP:', this.terminalIp);
      },
      error: (error) => {
        console.error('Error getting IP:', error);
        this.terminalIp = 'unknown';
        // Fallback to alternative service
        this.getFallbackIP();
      }
    });
  }


  private markFormGroupTouched(): void {
    Object.keys(this.frmGroup.controls).forEach(key => {
      this.frmGroup.get(key)?.markAsTouched();
    });
  }

  // Fallback IP service
  getFallbackIP(): void {
    this.http.get<any>('https://jsonip.com').subscribe({
      next: (response) => {
        this.terminalIp = response.ip;
        console.log('Fallback IP:', this.terminalIp);
      },
      error: (error) => {
        console.error('Fallback IP service also failed:', error);
        this.terminalIp = '127.0.0.1'; // Default fallback
      }
    });
  }

  doLogin() {
    // Check if form is valid before proceeding
    // if (this.frmGroup.invalid) {
    //   console.log('Form is invalid');
    //   this.markFormGroupTouched();
    //   return;
    // }

    // let payload = this.generatePayload();

    const body = new HttpParams()
      .set('grant_type', 'grant_password')
      .set('username', this.frmGroup.value.username)
      .set('password', this.frmGroup.value.password);

    // Basic Auth header (clientId:clientSecret → Base64)
    const basicAuth = btoa('901:901');

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`
    });


    this.loginError = false;
    this.errorMessage = '';
    this.isLoading = true;

    console.log("body = ", body);
    console.log("headers = ", headers);

    this.http.post(this.coreBaseUrl, body.toString(), { headers }).subscribe({
      next: async (response: any) => {
        this.isLoading = false;
        console.log('Login response', response);

        //  OAuth2 returns access_token directly, not in returnValue
        //comment
        if (response.access_token) {
          // Store the access token
          localStorage.setItem('authToken', response.access_token);
          sessionStorage.setItem('authToken', response.access_token);
          sessionStorage.setItem('isLoggedIn', 'true');
          sessionStorage.setItem('userId', this.frmGroup.value.username);
          const userId = this.frmGroup.value.username;
          localStorage.setItem('userId', userId);

          // Store refresh token if needed
          if (response.refresh_token) {
            localStorage.setItem('refreshToken', response.refresh_token);
          }

          console.log("Decoded Token:", this.decodeToken(response.access_token));
          this.loadUserDataResponse();
          try {
            console.log('Initializing Novu for user:', userId);
            const subscriberHash = await this.fetchSubscriberHash(userId);
            if (subscriberHash) {
              localStorage.setItem('novuSubscriberHash', subscriberHash);
            } else {
              localStorage.removeItem('novuSubscriberHash');
            }
            // await this.novuService.init(userId, 'oH9Vf1VWV7s8');
            await this.novuService.init(userId, '1uXpKIJUa3Rg');
            console.log('Novu initialized successfully!');
          } catch (err) {
            console.error('Failed to initialize Novu:', err);
          }
          setTimeout(() => {
            this.router.navigateByUrl('/dashboard');
          }, 100);
        } else {
          // Handle invalid login response
          console.log('Invalid login response - no access_token', response);
          this.loginError = true;
          this.errorMessage = response.error_description || 'Invalid credentials';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.loginError = true;

        // Better error message from OAuth2 response
        if (error.error && error.error.error_description) {
          this.errorMessage = error.error.error_description;
        } else {
          this.errorMessage = 'Login failed. Please try again.';
        }

        console.error('Login error:', error);
      }
    });
  }
  decodeToken(token: string) {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      this.tokenObject = decoded;
      console.log("Decoded Token:", decoded);
      this.loadDataFromToken();
      return decoded;
    } catch (error) {
      console.error("Invalid token:", error);
      return null;
    }
  }

  loadDataFromToken() {
    this.userAccessList = this.tokenObject.userAccessList;
    console.log("User Access List : ", this.userAccessList);
    localStorage.setItem('userAccessList', JSON.stringify(this.tokenObject.userAccessList));

     if (this.tokenObject.appAccessList) {
      localStorage.setItem('appList', JSON.stringify(this.tokenObject.appAccessList));

      this.setModuleBasedOnPort();
    }

  }

  setModuleBasedOnPort() {
    try {
      const currentPort = window.location.port;
      const appList = JSON.parse(localStorage.getItem('appList') || '[]');

      // Find module that matches current port
      const matchingModule = appList.find((app: any) => {
        if (app.appuri) {
          // Extract port from appuri (e.g., "http://localhost:4001" -> "4001")
          const urlMatch = app.appuri.match(/:(\d+)/);
          return urlMatch && urlMatch[1] === currentPort;
        }
        return false;
      });

      if (matchingModule) {
        localStorage.setItem('selectedModuleName', matchingModule.appName);
        console.log(`Auto-selected module: ${matchingModule.appName} for port ${currentPort}`);
      } else {
        // Fallback to first module if no port match
        const firstModule = appList[0];
        if (firstModule) {
          localStorage.setItem('selectedModuleName', firstModule.appName);
          console.log(`Fallback to first module: ${firstModule.appName}`);
        }
      }
    } catch (error) {
      console.error('Error setting module based on port:', error);
    }
  }

  private async fetchSubscriberHash(subscriberId: string): Promise<string | undefined> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ subscriberHash: string }>(`${this.notifyBaseUrl}/Notify/Subscribers/Hash`, {
          params: { subscriberId }
        })
      );
      return response?.subscriberHash;
    } catch (err) {
      console.error('Failed to fetch Novu subscriber hash:', err);
      return undefined;
    }
  }
  // loadUserDataResponse(): void {
  //   const sentinelSession = environment.sentinelSessionUrl;
  //   const centrinoSession = environment.centrinoSessionUrl;
  //   const params = {
  //     userId: localStorage.getItem('userId'),
  //     appId: 901
  //   };

  //   this.isLoading = true;

  //   this.http.get<UserDataResponse>(sentinelSession, { params: params as any }).subscribe({
  //     next: (response) => {
  //       // Store user profile
  //       if (response.userProfile) {
  //         localStorage.setItem('userProfile', JSON.stringify(response.userProfile));

  //         // Call officeSessionApiUrl API only if homeOfficeId exists
  //         const homeOfficeId = response.userProfile.homeOfficeId;
  //         if (homeOfficeId) {

  //           this.http.get(`${centrinoSession}/${homeOfficeId}`).subscribe({
  //             next: (officeData: any) => {
  //               console.log("officeData...", officeData);
  //               // Store office data in sessionStorage
  //               sessionStorage.setItem('companyId', officeData.companyId);
  //               sessionStorage.setItem('companyName', officeData.companyName);
  //               sessionStorage.setItem('officeId', officeData.officeId);
  //               sessionStorage.setItem('officeCode', officeData.officeCode);
  //               sessionStorage.setItem('officeNm', officeData.officeNm);
  //               sessionStorage.setItem('entityTypeId', officeData.entityTypeId);
  //               sessionStorage.setItem('officeTypeId', officeData.officeTypeId);
  //               sessionStorage.setItem('officeControlId', officeData.officeControlId);
  //               sessionStorage.setItem('txnDt', officeData.txnDt);
  //               sessionStorage.setItem('operationMode', officeData.operationMode);
  //               sessionStorage.setItem('operationModeFunction', officeData.operationModeFunction);
  //               sessionStorage.setItem('instituteType', officeData.instituteType);
  //               sessionStorage.setItem('localCurrencyId', officeData.localCurrencyId);
  //               sessionStorage.setItem('custProdIdLen', officeData.custProdIdLen);
  //               sessionStorage.setItem('custAccountNoLen', officeData.custAccountNoLen);
  //               sessionStorage.setItem('accountNoPtrnFlag', officeData.accountNoPtrnFlag);
  //               sessionStorage.setItem('errorCode', officeData.errorCode);
  //               sessionStorage.setItem('errorMessage', officeData.errorMessage);
  //             },
  //             error: (err) => {
  //               console.error('Error loading office session:', err);
  //             }
  //           });
  //         }
  //       }

  //       // Store user access list
  //       if (response.userAccessList) {
  //         this.userAccessList = response.userAccessList;
  //         localStorage.setItem('userAccessList', JSON.stringify(response.userAccessList));
  //       }

  //       // Store app access list if needed
  //       if (response.appAccessList) {
  //         localStorage.setItem('appAccessList', JSON.stringify(response.appAccessList));
  //       }

  //       console.log('User data loaded:', response);
  //       console.log("homeOfficeId...", response.userProfile.homeOfficeId);
  //       this.isLoading = false;
  //     },
  //     error: (err) => {
  //       console.error('Error loading user data:', err);
  //       this.error = 'Failed to load user data';
  //       this.isLoading = false;
  //     }
  //   });
  // }

  loadUserDataResponse(): void {

    this.isLoading = true;

    sessionStorage.setItem('companyId', this.tokenObject.companyId);
    sessionStorage.setItem('companyName', this.tokenObject.companyName);
    sessionStorage.setItem('officeId', this.tokenObject.homeOfficeId);
    sessionStorage.setItem('officeCode', this.tokenObject.officeCode);
    sessionStorage.setItem('officeName', this.tokenObject.officeName);
    sessionStorage.setItem('entityTypeId', this.tokenObject.entityTypeId);
    sessionStorage.setItem('officeTypeId', this.tokenObject.officeTypeId);
    sessionStorage.setItem('officeControlId', this.tokenObject.officeControlId);
    sessionStorage.setItem('txnDt', this.tokenObject.transactionDate);
    sessionStorage.setItem('operationMode', this.tokenObject.operationMode);
    sessionStorage.setItem('operationModeFunction', this.tokenObject.operationModeFunction);
    sessionStorage.setItem('instituteType', this.tokenObject.instituteType);
    sessionStorage.setItem('localCurrencyId', this.tokenObject.localCurrencyId);
    sessionStorage.setItem('custProdIdLen', this.tokenObject.customerProductIdLength);
    sessionStorage.setItem('custAccountNoLen', this.tokenObject.customerAccountNoLength);
    sessionStorage.setItem('accountNoPtrnFlag', this.tokenObject.accountNoPatternFlag);
    this.isLoading = false;
  }

  // generatePayload(): any {
  //   const currentDateTime = new Date().toISOString();

  //   return {
  //     "userId": this.frmGroup.value.username,
  //     "passwordString": this.frmGroup.value.password,
  //     "terminalIp": "192.168.20.69",
  //     "browser": this.getBrowserName(),
  //     "sessionId": this.generateSessionId(),
  //     "sessionTerminalIp": "192.168.10.127",
  //     "macAddress": "00:14:22:01:23:45",
  //     "appId": "901",
  //     "appLogInTime": "2025-08-21T10:30:00",
  //     "clientPCName": "DEV-PC",
  //     "clientMACAdd": "dddd-eeee-dddd-rrrr"
  //   };
  // }

  // Helper methods for generating dynamic values
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private generateSessionId(): string {
    const sessionId = 'sess-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    sessionStorage.setItem('sessionId', sessionId);
    return sessionId;
  }

  private getClientPCName(): string {
    // Browser cannot access actual PC name, so we'll use a fallback
    return navigator.platform || 'WEB-CLIENT';
  }
}

// "userId": this.frmGroup.value.username,
// "passwordString": this.frmGroup.value.password,
// "terminalIp": this.terminalIp,
// "browser": this.getBrowserName(),
// "sessionId": this.generateSessionId(),
// "sessionTerminalIp": this.terminalIp,
// "macAddress": "00:14:22:01:23:45",
// "appId": "3",
// "appLogInTime": currentDateTime,
// "clientPCName": this.getClientPCName(),
// "clientMACAdd": "dddd-eeee-dddd-rrrr"
