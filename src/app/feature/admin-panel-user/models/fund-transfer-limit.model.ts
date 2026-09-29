/**
 * fund-transfer-limit / shared — model types.
 *
 * Mirrors the demo Vue model `IFundTransferLimitInfoBody.ts`. Field names
 * are mixed-case on purpose (the CloudNetManagementAPI returns them
 * that way) so we can consume the response without remapping.
 */

/** Standard API envelope used by every CloudNetManagementAPI endpoint. */
export interface ApiResponse<T> {
  Status: 'OK' | 'UNAUTH' | string;
  Message: string;
  Result: T;
}

/** Branch dropdown payload (same shape used by UserManagement/getBranchList). */
export interface Branch {
  brancH_ID: string;
  brancH_NM: string;
}

/**
 * /FundTransferLimit/GetGlobalFundTrfPolicy — full global-policy body.
 * 67 fields matching the demo's IFundTransferLimitInfoBody verbatim.
 */
export interface IFundTransferLimitInfoBody {
  // ── Individual client ───────────────────────────────────────────────────
  inD_TRANS_PER_DAY: string;
  inD_TRANS_AMT_PER_DAY: string;
  inD_AMT_PER_TRANS: string;
  inD_AMOUNT_PER_TRANS_MIN: string;

  // ── Corporate client ────────────────────────────────────────────────────
  corP_TRANS_PER_DAY: string;
  corP_TRANS_AMT_DAY: string;
  corP_AMT_PER_TRANS: string;
  corP_AMOUNT_PER_TRANS_MIN: string;

  // ── Global max limit ────────────────────────────────────────────────────
  inD_GLOBAL_MAX_LIMIT: string;
  corP_GLOBAL_MAX_LIMIT: string;

  // ── Flags ───────────────────────────────────────────────────────────────
  fT_ENABLE_FLAG: string;
  owN_ACCOUNT_FLAG: string;
  otheR_ACCOUNT_FLAG: string;
  otheR_BANK_ACCOUNT_FLAG: string;
  ibT_CODE: string;

  // ── IND own account ─────────────────────────────────────────────────────
  inD_TRN_NO_DAY_OWN_ACC: string;
  inD_TRN_AMOUNT_DAY_OWN_ACC: string;
  inD_AMT_PER_TRANS_OWN_ACC: string;

  // ── IND other account ───────────────────────────────────────────────────
  inD_TRN_NO_DAY_OTHER_ACC: string;
  inD_TRN_AMOUNT_DAY_OTHER_AC0C: string;
  inD_AMT_PER_TRANS_OTHER_ACC: string;

  // ── CORP own account ────────────────────────────────────────────────────
  corP_TRN_NO_DAY_OWN_ACC: string;
  corP_TRN_AMOUNT_DAY_OWN_ACC: string;
  corP_AMT_PER_TRANS_OWN_ACC: string;

  // ── CORP other account ──────────────────────────────────────────────────
  corP_TRN_NO_DAY_OTHER_ACC: string;
  corP_TRN_AMOUNT_DAY_OTHER_ACC: string;
  corP_AMT_PER_TRANS_OTHER_ACC: string;

  // ── Branch / BEFT / NPSB / Q-Cash / Charge ──────────────────────────────
  pB_BRANCH_ID: string;
  otheR_BANK_BEFT_BRANCH_ID: string;
  otheR_BANK_BEFT_ACC_NO: string;
  chargE_RULE_ID: string;
  chargE_EVENT_ID: string;
  iS_CHARGE_APPLICABLE_TO_PB: string;
  otheR_BANK_BB_EFT_HEAD: string;

  // ── Per-account min amounts ─────────────────────────────────────────────
  inD_AMT_PER_TRANS_MIN_OWN: string;
  corP_AMT_PER_TRANS_MIN_OWN: string;
  inD_AMT_PER_TRANS_MIN_OTHER: string;
  corP_AMT_PER_TRANS_MIN_OTHER: string;

  // ── IND/CORP other-bank-account ─────────────────────────────────────────
  inD_TRN_NO_DAY_OTHER_BANK_ACC: string;
  inD_TRN_AMT_DAY_OTHER_BANK_ACC: string;
  inD_AMT_PER_TRN_OTHER_BANK_ACC: string;
  inD_AMT_PER_TRN_MIN_OTHER_BANK: string;

  corP_TRN_NO_DAY_OTHER_BANK_AC: string;
  corP_TRN_AMT_DAY_OTHER_BANK_AC: string;
  corP_AMT_PER_TRN_OTHER_BANK_AC: string;
  corP_AMT_PER_TRN_MIN_OTHR_BANK: string;

  // ── NPSB / Q-Cash / Bkash / SSL ─────────────────────────────────────────
  otheR_BANK_NPSB_BR_ID: string;
  otheR_BANK_NPSB_ACC_NO: string;
  otheR_BANK_Q_CASH_NPSB_BR_ID: string;
  otheR_BANK_Q_CASH_NPSB_ACC_NO: string;
  q_CASH_CHARGE_RULE_ID: string;
  otheR_BANK_BKASH_BR_ID: string;
  otheR_BANK_BKASH_ACC_NO: string;
  ssL_MERCHANT_ACC: string;
  ssL_MERCHANT_ACC_BR_ID: string;
  merchanT_BANK_ACC: string;
  merchanT_BANK_ACC_BR_ID: string;
}

/** /FundTransferLimit/GetInternalFundTrfPolicy — single row of per-transfer-type limits. */
export interface InternalFundTrfPolicy {
  transferType: string;
  minAmountPerTrans: number;
  maxAmountPerTrans: number;
  maxAmountTransPerDay: number;
  maxNumOfTransPerDay: number;
}

/** /Request/UpdateFundTrfPolicy — single-row payload. */
export interface UpdateFundTrfPolicyPayload {
  UserId: string;
  TransferType: string;
  MinAmountPerTrans: number;
  MaxAmountPerTrans: number;
  MaxAmountTransPerDay: number;
  MaxNumOfTransPerDay: number;
}

/** Static catalogue of transfer-type names. */
export const TRANSFER_TYPE_LIST: { id: string; name: string }[] = [
  { name: 'Own Bank',                       id: 'OWNBANK'        },
  { name: 'Own Bank To Other Account',      id: 'OWNBANKOTHERACC'},
  { name: 'Bkash',                          id: 'BKASH'          },
  { name: 'Bkash ITCL',                     id: 'ITCLBKASH'      },
  { name: 'Top Up',                         id: 'TOPUP'          },
  { name: 'QR Cash',                        id: 'QRCASH'         },
  { name: 'QR PAY',                         id: 'QRPAY'          },
  { name: 'SSL Commerce',                   id: 'SSLCOMMERCE'    }
];

/** Default body for the Global Users tab (all numeric flags = "0"). */
export const DEFAULT_GLOBAL_POLICY: IFundTransferLimitInfoBody = {
  inD_TRANS_PER_DAY: '0',
  inD_TRANS_AMT_PER_DAY: '0',
  inD_AMT_PER_TRANS: '0',
  corP_TRANS_PER_DAY: '0',
  corP_TRANS_AMT_DAY: '0',
  corP_AMT_PER_TRANS: '0',
  inD_GLOBAL_MAX_LIMIT: '0',
  corP_GLOBAL_MAX_LIMIT: '0',
  fT_ENABLE_FLAG: '0',
  owN_ACCOUNT_FLAG: '0',
  otheR_ACCOUNT_FLAG: '0',
  otheR_BANK_ACCOUNT_FLAG: '0',
  ibT_CODE: '0',
  inD_TRN_NO_DAY_OWN_ACC: '0',
  inD_TRN_AMOUNT_DAY_OWN_ACC: '0',
  inD_AMT_PER_TRANS_OWN_ACC: '0',
  inD_TRN_NO_DAY_OTHER_ACC: '0',
  inD_TRN_AMOUNT_DAY_OTHER_AC0C: '0',
  inD_AMT_PER_TRANS_OTHER_ACC: '0',
  corP_TRN_NO_DAY_OWN_ACC: '0',
  corP_TRN_AMOUNT_DAY_OWN_ACC: '0',
  corP_AMT_PER_TRANS_OWN_ACC: '0',
  corP_TRN_NO_DAY_OTHER_ACC: '0',
  corP_TRN_AMOUNT_DAY_OTHER_ACC: '0',
  corP_AMT_PER_TRANS_OTHER_ACC: '0',
  pB_BRANCH_ID: '0',
  otheR_BANK_BEFT_BRANCH_ID: '0',
  otheR_BANK_BEFT_ACC_NO: '0',
  chargE_RULE_ID: '0',
  chargE_EVENT_ID: '0',
  iS_CHARGE_APPLICABLE_TO_PB: '0',
  otheR_BANK_BB_EFT_HEAD: '0',
  inD_AMOUNT_PER_TRANS_MIN: '0',
  corP_AMOUNT_PER_TRANS_MIN: '0',
  inD_AMT_PER_TRANS_MIN_OWN: '0',
  corP_AMT_PER_TRANS_MIN_OWN: '0',
  inD_AMT_PER_TRANS_MIN_OTHER: '0',
  corP_AMT_PER_TRANS_MIN_OTHER: '0',
  inD_TRN_NO_DAY_OTHER_BANK_ACC: '0',
  inD_TRN_AMT_DAY_OTHER_BANK_ACC: '0',
  inD_AMT_PER_TRN_OTHER_BANK_ACC: '0',
  inD_AMT_PER_TRN_MIN_OTHER_BANK: '0',
  corP_TRN_NO_DAY_OTHER_BANK_AC: '0',
  corP_TRN_AMT_DAY_OTHER_BANK_AC: '0',
  corP_AMT_PER_TRN_OTHER_BANK_AC: '0',
  corP_AMT_PER_TRN_MIN_OTHR_BANK: '0',
  otheR_BANK_NPSB_BR_ID: '0',
  otheR_BANK_NPSB_ACC_NO: '0',
  otheR_BANK_Q_CASH_NPSB_BR_ID: '0',
  otheR_BANK_Q_CASH_NPSB_ACC_NO: '0',
  q_CASH_CHARGE_RULE_ID: '0',
  otheR_BANK_BKASH_BR_ID: '0',
  otheR_BANK_BKASH_ACC_NO: '0',
  ssL_MERCHANT_ACC: '0',
  ssL_MERCHANT_ACC_BR_ID: '0',
  merchanT_BANK_ACC: '0',
  merchanT_BANK_ACC_BR_ID: '0'
};
