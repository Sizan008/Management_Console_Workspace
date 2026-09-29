import { Injectable, Inject, Optional } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';
import { formatDateAs } from '../../../../helpers/date-format.helper';

export interface DateFormatConfig {
  format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' | 'DD MMM, YYYY';
}

export const DATE_FORMAT_CONFIG = 'DATE_FORMAT_CONFIG';

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  private currentFormat: DateFormatConfig['format'] = 'DD/MM/YYYY';

  constructor(
    @Optional() @Inject(DATE_FORMAT_CONFIG) private config?: DateFormatConfig
  ) {
    super();
    if (config?.format) {
      this.currentFormat = config.format;
    }
  }

  // Method to update format dynamically
  setFormat(format: DateFormatConfig['format']): void {
    console.log(`Date format changed from ${this.currentFormat} to ${format}`);
    this.currentFormat = format;
  }

  override parse(value: string): Date | null {
    if (!value) return null;
    
    const trimmedValue = value.trim();
    
    // Remove any placeholder characters that might remain from the mask
    const cleanValue = trimmedValue.replace(/_/g, '');
    
    if (cleanValue.length < 8) return null; // Minimum length check for complete date
    
    // Handle the 'DD MMM, YYYY' display format
    if (this.currentFormat === 'DD MMM, YYYY') {
      return this.parseMonthAbbreviationFormat(cleanValue);
    }
    
    // Handle other formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
    const separator = this.getSeparator();
    const parts = cleanValue.split(separator);
    
    if (parts.length === 3) {
      let day: number, month: number, year: number;
      
      switch (this.currentFormat) {
        case 'DD/MM/YYYY':
        case 'DD-MM-YYYY':
          day = +parts[0];
          month = +parts[1] - 1; // Month is 0-indexed
          year = +parts[2];
          break;
          
        case 'MM/DD/YYYY':
        case 'MM-DD-YYYY':
          month = +parts[0] - 1; // Month is 0-indexed
          day = +parts[1];
          year = +parts[2];
          break;
          
        case 'YYYY/MM/DD':
        case 'YYYY-MM-DD':
          year = +parts[0];
          month = +parts[1] - 1; // Month is 0-indexed
          day = +parts[2];
          break;
          
        default:
          return null;
      }
      
      // Validate the parsed values
      if (this.isValidDate(year, month, day)) {
        return new Date(year, month, day);
      }
    }
    
    return null;
  }

  override format(date: Date): string {
    // Format according to the currently selected/preferred date format.
    return formatDateAs(date, this.currentFormat);
  }

  // Override this to provide better validation for masked inputs
  override isValid(obj: any): boolean {
    if (!obj) return false;
    
    if (typeof obj === 'string') {
      // Check if the string matches the expected format and is a valid date
      const parsed = this.parse(obj);
      return parsed !== null && !isNaN(parsed.getTime());
    }
    
    if (obj instanceof Date) {
      return !isNaN(obj.getTime());
    }
    
    return false;
  }

  private getSeparator(): string {
    if (this.currentFormat === 'DD MMM, YYYY') {
      return ' '; // Space separator for the new format
    }
    return this.currentFormat.includes('/') ? '/' : '-';
  }

  private isValidDate(year: number, month: number, day: number): boolean {
    // Basic validation
    if (year < 1900 || year > 2999) return false;
    if (month < 0 || month > 11) return false;
    if (day < 1 || day > 31) return false;
    
    // Create date and check if it's the same as input (handles invalid dates like Feb 30)
    const testDate = new Date(year, month, day);
    return testDate.getFullYear() === year &&
           testDate.getMonth() === month &&
           testDate.getDate() === day;
  }

  private parseMonthAbbreviationFormat(value: string): Date | null {
    // Expected format: "18 Aug, 2025" or "18 Aug 2025"
    const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);
    
    if (!match) return null;
    
    const day = parseInt(match[1]);
    const monthAbbr = match[2].toLowerCase();
    const year = parseInt(match[3]);
    
    // Month abbreviation mapping
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    const month = monthMap[monthAbbr];
    if (month === undefined) return null;
    
    // Validate the parsed values
    if (this.isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
    
    return null;
  }
}

// Alternative approach: Create a factory function for different formats
export function createCustomDateAdapter(format: DateFormatConfig['format']) {
  return class extends CustomDateAdapter {
    constructor() {
      super({ format });
    }
  };
}