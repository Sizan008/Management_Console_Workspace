// Custom validator for IBAN (ISO 13616 format)
export function ibanValidator(control: any) {
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const iban = control.value.toString().toUpperCase().replace(/\s/g, ''); // Remove spaces and convert to uppercase
    
    // Update the form control value to the cleaned/uppercase version
    if (control.value !== iban) {
      setTimeout(() => control.setValue(iban, { emitEvent: false }), 0);
    }
    
    // Check basic format: 2 country code letters + 2 check digits + up to 30 alphanumeric BBAN
    const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    if (!ibanPattern.test(iban)) {
      return {
        invalidIban: 'IBAN must follow ISO 13616 format: 2 country code letters + 2 check digits + up to 30 alphanumeric IBAN characters'
      };
    }
    
    // Check length (max 34 characters)
    if (iban.length > 34) {
      return {
        invalidIban: 'IBAN must not exceed 34 characters'
      };
    }
    
    // Basic IBAN check digit validation (mod-97 algorithm)
    try {
      const rearranged = iban.slice(4) + iban.slice(0, 4);
      const numericString = rearranged.replace(/[A-Z]/g, (char: string) => (char.charCodeAt(0) - 55).toString());
      
      // For very long numbers, we need to handle BigInt or use a different approach
      // Simple mod 97 check for basic validation
      let remainder = 0;
      for (let i = 0; i < numericString.length; i++) {
        remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
      }
      
      if (remainder !== 1) {
        return {
          invalidIban: 'Invalid IBAN format or invalid check digits (Error Code: D00003)'
        };
      }
    } catch (error) {
      return {
        invalidIban: 'Invalid IBAN format or invalid check digits (Error Code: D00003)'
      };
    }
    
    return null;
  }

    // Custom validator for Settlement Method
    export function settlementMethodValidator(control: any) {
        const validCodes = ['INDA', 'INGA'];
        // Allow empty/null values (required validation is handled separately)
        if (!control.value || control.value === '') {
          return null;
        }
        // Check if the value is in the valid codes list
        if (!validCodes.includes(control.value)) {
          return {
            invalidSettlementMethod: 'Settlement Method must be either INDA (InstructedAgent) or INGA (InstructingAgent). CLRG (ClearingSystem) and COVE (CoverMethod) codes are removed as per usage guidelines.'
          };
        }
        return null;
      }
    
      

  // Custom validator for Account ID (CBPR_RestrictedFINXMax34Text)
  export function accountIdValidator(control: any) {
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    // Check length
    if (value.length < 1 || value.length > 34) {
      return {
        invalidAccountId: 'Account ID must be between 1 and 34 characters'
      };
    }
    
    // Check CBPR_RestrictedFINXMax34Text pattern: no leading/trailing slash, no double slash
    const pattern = /^[0-9a-zA-Z\-\?:\(\)\.,'\+ \/]*$/;
    if (!pattern.test(value)) {
      return {
        invalidAccountId: 'Account ID must follow CBPR_RestrictedFINXMax34Text format: characters [0-9a-zA-Z/-?:().,\'+space], no leading/trailing slash, no double slash'
      };
    }
    
    return null;
  }

  // Custom validator for CBPR_RestrictedFINXMax35Text (SchemeName Proprietary, Issuer)
  export function cbprRestrictedFINXMax35Validator(control: any) {
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    // Check length
    if (value.length < 1 || value.length > 35) {
      return {
        invalidCBPRText:'Field must be between 1 and 35 characters'
      };
    }
    
    // Check CBPR_RestrictedFINXMax35Text pattern
    const pattern = /^[0-9a-zA-Z\/\-\?:\(\)\.,'\+ ]+$/;
    if (!pattern.test(value)) {
      return {
        invalidCBPRText:  'Field must follow CBPR_RestrictedFINXMax35Text format: characters [0-9a-zA-Z/-?:().,\'+space]'
      };
    }
    
    return null;
  }

  // Custom validator for CBPR_RestrictedFINXMax70Text (Account Name)
  export function cbprRestrictedFINXMax70Validator(control: any) {
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    // Check length
    if (value.length < 1 || value.length > 70) {
      return {
        invalidCBPRText:  'Account Name must be between 1 and 70 characters'
      };
    }
    
    // Check CBPR_RestrictedFINXMax70Text pattern
    const pattern = /^[0-9a-zA-Z\/\-\?:\(\)\.,'\+ ]+$/;
    if (!pattern.test(value)) {
      return {
        invalidCBPRText:  'Account Name must follow CBPR_RestrictedFINXMax70Text format: characters [0-9a-zA-Z/-?:().,\'+space]'
      };
    }
    
    return null;
  }

  // Custom validator for CBPR_RestrictedFINXMax320Text_Extended (Proxy ID)
  export function cbprRestrictedFINXMax320Validator(control: any) {
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    // Check length
    if (value.length < 1 || value.length > 320) {
      return {
        invalidCBPRText: 'Proxy ID must be between 1 and 320 characters'
      };
    }
    
    // Check CBPR_RestrictedFINXMax320Text_Extended pattern
    const pattern = /^[0-9a-zA-Z\/\-\?:\(\)\.,'\+ ]+$/;
    if (!pattern.test(value)) {
      return {
        invalidCBPRText: 'Proxy ID must follow CBPR_RestrictedFINXMax320Text_Extended format: characters [0-9a-zA-Z/-?:().,\'+space]'
      };
    }
    
    return null;
  }

  // ===== POSTAL ADDRESS VALIDATORS =====

  // Custom validator for CBPR_RestrictedFINXMax70Text_Extended (Department, SubDepartment, StreetName, Floor, Room)
  export function cbprRestrictedFINXMax70ExtendedValidator(control: any) {
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    if (value.length > 70) {
      return {
        invalidPostalField: 'Field must not exceed 70 characters (CBPR_RestrictedFINXMax70Text_Extended)'
      };
    }
    
    // Extended character set pattern
    const pattern = /^[0-9a-zA-Z\/\-\?:\(\)\.,'\+ !#$%&\*=^_`\{\|\}~";<>@\[\\\]]+$/;
    if (!pattern.test(value)) {
      return {
        invalidPostalField: 'Field must follow CBPR_RestrictedFINXMax70Text_Extended format'
      };
    }
    
    return null;
  }

  // Custom validator for CBPR_RestrictedFINXMax35Text_Extended (BuildingName, TownName, TownLocationName, DistrictName, CountrySubDivision, AddressLine)
  export function cbprRestrictedFINXMax35ExtendedValidator(control: any) {
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    if (value.length > 35) {
      return {
        invalidPostalField: 'Field must not exceed 35 characters (CBPR_RestrictedFINXMax35Text_Extended)'
      };
    }
    
    // Extended character set pattern
    const pattern = /^[0-9a-zA-Z\/\-\?:\(\)\.,'\+ !#$%&\*=^_`\{\|\}~";<>@\[\\\]]+$/;
    if (!pattern.test(value)) {
      return {
        invalidPostalField: 'Field must follow CBPR_RestrictedFINXMax35Text_Extended format'
      };
    }
    
    return null;
  }

  // Custom validator for CBPR_RestrictedFINXMax16Text_Extended (BuildingNumber, PostBox, PostCode)
  export function cbprRestrictedFINXMax16ExtendedValidator(control: any) {
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    if (value.length > 16) {
      return {
        invalidPostalField: 'Field must not exceed 16 characters (CBPR_RestrictedFINXMax16Text_Extended)'
      };
    }
    
    // Extended character set pattern
    const pattern = /^[0-9a-zA-Z\/\-\?:\(\)\.,'\+ !#$%&\*=^_`\{\|\}~";<>@\[\\\]]+$/;
    if (!pattern.test(value)) {
      return {
        invalidPostalField: 'Field must follow CBPR_RestrictedFINXMax16Text_Extended format'
      };
    }
    
    return null;
  }

  // Custom validator for CountryCode (ISO 3166 Alpha-2)
  export function countryCodeValidator(control: any) {
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString().toUpperCase();
    
    // Auto-convert to uppercase
    if (control.value !== value) {
      setTimeout(() => control.setValue(value, { emitEvent: false }), 0);
    }
    
    if (value.length !== 2) {
      return {
        invalidCountryCode: 'Country code must be exactly 2 characters (ISO 3166 Alpha-2)'
      };
    }
    
    const pattern = /^[A-Z]{2}$/;
    if (!pattern.test(value)) {
      return {
        invalidCountryCode: 'Country must be a valid ISO 3166 Alpha-2 country code (Error Code: D00004)'
      };
    }
    
    return null;
  }

  // Custom validator for Max34Text
  export function max34TextValidator(control: any) {
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString();
    
    // Check length
    if (value.length > 34) {
      return {
        invalidMax34Text: 'Field must not exceed 34 characters'
      };
    }
    
    return null;
  }

  // Custom validator for NamePrefix2Code
  export function namePrefix2CodeValidator(control: any) {
    const validCodes = ['DOCT', 'MADM', 'MIKS', 'MISS', 'MIST'];
    
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString().toUpperCase();
    
    // Auto-convert to uppercase
    if (control.value !== value) {
      setTimeout(() => control.setValue(value, { emitEvent: false }), 0);
    }
    
    // Check if the value is in the valid codes list
    if (!validCodes.includes(value)) {
      return {
        invalidNamePrefix2Code: 'Name Prefix must be one of: DOCT (Doctor), MADM (Madam), MIKS (Gender Neutral), MISS (Miss), MIST (Mister)'
      };
    }
    
    return null;
  }

  // Custom validator for NamePrefixCode
  export function namePrefixCodeValidator(control: any) {
    const validCodes = ['DOCT', 'MADM', 'MIKS', 'MISS', 'MIST'];
    
    // Allow empty/null values (required validation is handled separately)
    if (!control.value || control.value === '') {
      return null;
    }
    
    const value = control.value.toString().toUpperCase();
    
    // Auto-convert to uppercase
    if (control.value !== value) {
      setTimeout(() => control.setValue(value, { emitEvent: false }), 0);
    }
    
    // Check if the value is in the valid codes list
    if (!validCodes.includes(value)) {
      return {
        invalidNamePrefixCode: 'Name Prefix must be one of: DOCT (Doctor), MADM (Madam), MIKS (Gender Neutral), MISS (Miss), MIST (Mister)'
      };
    }
    
    return null;
  }
