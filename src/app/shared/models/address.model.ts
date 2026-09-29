// address.model.ts

export interface AddressDto {
  villWardId: string;
  villWardNm: string;
  villWardShNm: string;
  isVillage: number;
  vwApproveFlag: number;
  unionMuniId: number;
  unionMuniName: string;
  unionMuniShNm: string;
  thanaId: number;
  thanaNm: string;
  thanaShNm: string | null;
  districtId: number;
  districtNm: string;
  divisionId: number;
  divisionNm: string;
  divisionShNm: string;
  upozilaCitycorpId: number | null;
  upozilaCitycorpNm: string | null;
  mouzaId: number | null;
  mouzaNm: string | null;
  countryId: number;
  countryNm: string;
  countryShNm: string;
}

// For displaying in dropdown/autocomplete
export interface AddressDisplayOption {
  id: string;
  displayText: string;
  area: string;
  thana: string;
  district: string;
  division: string;
  fullAddress: string;
}

export type AddressSearchResponse = AddressDto[];
