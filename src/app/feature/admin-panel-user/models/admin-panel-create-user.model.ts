/**
 * admin-panel-user / Create IB User — model types.
 *
 * IMPORTANT: The CloudNetManagementAPI returns mixed-case JSON keys
 * (e.g. `brancH_ID`, `customeR_TYPE_ID`, `birtH_DATE`). These names
 * match the demo Vue component (UserCreationNew.vue) exactly so the
 * server response can be consumed without remapping.
 */

/** Standard API envelope used by every CloudNetManagementAPI endpoint. */
export interface ApiResponse<T> {
  Status: 'OK' | 'UNAUTH' | string;
  Message: string;
  Result: T;
}

/** /UserManagement/getBranchList — branch dropdown. */
export interface Branch {
  brancH_ID: string;
  brancH_NM: string;
}

/** /UserManagement/getCustomerInfo — full customer record. */
export interface CustomerInfo {
  basic: {
    customeR_ID: string;
    customeR_FULL_NM: string;
    customeR_TYPE_ID: string;   // '2' means organization user (extra fields show)
    customeR_TYPE_NM: string;
    brancH_ID: string;
    brancH_NM: string;
    birtH_DATE?: string;
    fatheR_NM?: string;
    motheR_NM?: string;
    description?: string;
  };
  address: Array<{
    addressType?: string;
    addressTypeId?: string;
    addressLine1?: string;
    addressLine2?: string;
    mobile?: string;
    mobile2?: string;
    mobile3?: string;
    mobile4?: string;
    mobile5?: string;
    email?: string;
  }>;
}

/** /UserManagement/GetOrgAuthLvlName — org-only auth level dropdown. */
export interface AuthLevel {
  lvlId: string;
  lvlNM: string;
}

/** /UserManagement/getCustomerAccountList — org-only account list. */
export interface CustomerAccount {
  brancH_ID: string;
  accounT_NUMBER: string;
  [k: string]: any;
}

/** /UserManagement/GetFundTransferTypes — org-only transfer type list. */
export interface FundTransferType {
  id: string;
  title: string;
}

/** /UserManagement/UserCreation — payload sent on submit. */
export interface CreateUserPayload {
  UserInformation: {
    UserID: string;
    UserNM: string;
    BranchName: string;
    AccountNo: string;
    CustomerId: string;
    BranchId: string;
    AuthenticationType: string;
    VerificationFlag: string;
    AccountAddressTypeId: string;
    UserAddress: string;
    PhoneNumber: string;
    Email: string;
    Imei1: string;
    Imei2: string;
    DOB: string;
    UserOrgLvl: string;
  };
  accountWiseMultiFT: Array<{
    BRANCH_ID: string;
    ACCOUNT_NUMBER: string;
    TRANSFER_TYPE: string;
    MIN_AMOUNT_PER_TRANS: number;
    MAX_AMOUNT_PER_TRANS: number;
    MAX_AMOUNT_TRANS_PER_DAY: number;
    MAX_NO_OF_TRANS_PER_DAY: number;
  }>;
}
