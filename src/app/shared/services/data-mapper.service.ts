// AUTO-GENERATE TABLE FROM ANY API DATA
// ======================================
// WITH ROWSPAN/COLSPAN SUPPORT!

import { Injectable } from '@angular/core';
import { DynamicTableConfig, TableSection, TableRow, TableCell } from '../common-components/generic-component-type/generic-table/generic-table';

/**
 * Configuration for specific field customization
 */
export interface FieldCustomization {
  colspan?: number;           // Number of columns to span
  rowspan?: number;           // Number of rows to span
  highlighted?: boolean;      // Yellow background
  className?: string;         // Custom CSS class
  style?: Record<string, string>; // Inline styles
  formatter?: (value: any) => string; // Custom formatter
}

/**
 * Define custom row layouts
 */
export interface CustomRowLayout {
  sectionKey: string;         // Which section this applies to
  position?: 'start' | 'end' | number; // Where to insert
  cells: CustomCell[];        // Cells in this row
}

export interface CustomCell {
  label?: string;             // Label text
  key?: string;               // Data key to get value
  value?: any;                // Static value (if not using key)
  colspan?: number;           // Column span
  rowspan?: number;           // Row span
  highlighted?: boolean;      // Highlight
  className?: string;         // Custom class
  type?: 'label' | 'value';   // Cell type
}

/**
 * Configuration options for auto-generation
 */
export interface AutoTableOptions {
  // Section grouping
  groupBy?: 'none' | 'object';

  // Field customization
  excludeFields?: string[];
  fieldLabels?: Record<string, string>;
  fieldOrder?: string[];

  // Formatting
  highlightFields?: string[];
  fullWidthFields?: string[];
  currencyFields?: string[];
  dateFields?: string[];

  // 🎯 NEW: Advanced customization
  fieldCustomizations?: Record<string, FieldCustomization>;
  customRows?: CustomRowLayout[];

  // Layout
  columnsPerRow?: number;

  // Styling
  sectionTitles?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class AutoTableService {

  /**
   * 🎯 MAIN METHOD: Auto-generate table from ANY API data
   */
  autoGenerateTable(apiData: any, options: AutoTableOptions = {}): DynamicTableConfig {
    const {
      groupBy = 'object',
      excludeFields = [],
      fieldLabels = {},
      fieldOrder = [],
      highlightFields = [],
      fullWidthFields = [],
      currencyFields = [],
      dateFields = [],
      fieldCustomizations = {},
      customRows = [],
      columnsPerRow = 2,
      sectionTitles = {}
    } = options;

    const sections: TableSection[] = [];

    if (groupBy === 'object') {
      // Create one section per top-level object
      Object.keys(apiData).forEach(key => {
        if (excludeFields.includes(key)) return;

        const sectionData = apiData[key];
        if (typeof sectionData === 'object' && !Array.isArray(sectionData)) {
          const section = this.createSection(
            sectionTitles[key] || this.formatLabel(key),
            key,
            sectionData,
            {
              excludeFields,
              fieldLabels,
              fieldOrder,
              highlightFields,
              fullWidthFields,
              currencyFields,
              dateFields,
              fieldCustomizations,
              customRows,
              columnsPerRow
            }
          );
          sections.push(section);
        }
      });
    } else {
      // Create single section
      const section = this.createSection(
        'Information',
        '',
        apiData,
        {
          excludeFields,
          fieldLabels,
          fieldOrder,
          highlightFields,
          fullWidthFields,
          currencyFields,
          dateFields,
          fieldCustomizations,
          customRows,
          columnsPerRow
        }
      );
      sections.push(section);
    }

    return {
      sections,
      loading: false,
      error: null
    };
  }

  /**
   * Create section with custom rows support
   */
  private createSection(
    title: string,
    sectionKey: string,
    data: any,
    options: any
  ): TableSection {
    const fields = this.extractFields(data, options);
    let rows = this.groupFieldsIntoRows(fields, options.columnsPerRow, options.fieldCustomizations);

    // Add custom rows if specified
    const customRowsForSection = options.customRows.filter(
      (cr: CustomRowLayout) => cr.sectionKey === sectionKey
    );

    customRowsForSection.forEach((customRow: CustomRowLayout) => {
      const row = this.createCustomRow(customRow, data);

      if (customRow.position === 'start') {
        rows.unshift(row);
      } else if (customRow.position === 'end') {
        rows.push(row);
      } else if (typeof customRow.position === 'number') {
        rows.splice(customRow.position, 0, row);
      } else {
        rows.push(row);
      }
    });

    return {
      title,
      rows
    };
  }

  /**
   * Create custom row from layout definition
   */
  private createCustomRow(layout: CustomRowLayout, data: any): TableRow {
    const cells: TableCell[] = layout.cells.map(cellDef => {
      let value = cellDef.value;

      // Get value from data if key is specified
      if (cellDef.key) {
        value = this.getNestedValue(data, cellDef.key);
      }

      return {
        label: cellDef.label,
        value: cellDef.value !== undefined ? cellDef.value : value,
        colspan: cellDef.colspan,
        rowspan: cellDef.rowspan,
        highlighted: cellDef.highlighted,
        className: cellDef.className,
        type: cellDef.type || (cellDef.label ? 'label' : 'value')
      };
    });

    return { cells };
  }

  /**
   * Extract fields from object
   */
  private extractFields(data: any, options: any): any[] {
    let fields: any[] = [];

    Object.keys(data).forEach(key => {
      if (options.excludeFields.includes(key)) return;

      const value = data[key];

      // Skip nested objects
      if (typeof value === 'object' && value !== null) return;

      // Get customization for this field
      const customization = options.fieldCustomizations[key] || {};

      fields.push({
        key,
        value,
        label: options.fieldLabels[key] || this.formatLabel(key),
        highlighted: options.highlightFields.includes(key) || customization.highlighted,
        fullWidth: options.fullWidthFields.includes(key),
        isCurrency: options.currencyFields.includes(key),
        isDate: options.dateFields.includes(key),
        colspan: customization.colspan,
        rowspan: customization.rowspan,
        className: customization.className,
        formatter: customization.formatter
      });
    });

    // Apply field order
    if (options.fieldOrder.length > 0) {
      fields.sort((a, b) => {
        const indexA = options.fieldOrder.indexOf(a.key);
        const indexB = options.fieldOrder.indexOf(b.key);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return fields;
  }

  /**
   * Group fields into rows with colspan/rowspan support
   */
  private groupFieldsIntoRows(
    fields: any[],
    columnsPerRow: number,
    fieldCustomizations: Record<string, FieldCustomization>
  ): TableRow[] {
    const rows: TableRow[] = [];
    let i = 0;

    while (i < fields.length) {
      const cells: TableCell[] = [];
      let columnsUsed = 0;

      while (i < fields.length && columnsUsed < columnsPerRow) {
        const field = fields[i];
        const customization = fieldCustomizations[field.key] || {};

        // Determine colspan
        let colspan = field.colspan || customization.colspan || 1;
        if (field.fullWidth) {
          colspan = columnsPerRow * 2; // Full width
        }

        // Add label cell
        cells.push({
          label: field.label + ' :',
          colspan: Math.min(1, colspan),
          rowspan: field.rowspan || customization.rowspan,
          type: 'label',
          className: field.className || customization.className
        });

        // Add value cell
        const valueColspan = colspan > 1 ? colspan - 1 : 1;
        cells.push({
          value: field.formatter
            ? field.formatter(field.value)
            : this.formatValue(field.value, field),
          colspan: valueColspan,
          rowspan: field.rowspan || customization.rowspan,
          type: 'value',
          highlighted: field.highlighted,
          className: field.className || customization.className,
          style: customization.style
        });

        columnsUsed += (colspan > 1 ? colspan : 1);
        i++;

        if (columnsUsed >= columnsPerRow) break;
      }

      rows.push({ cells });
    }

    return rows;
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    return value;
  }

  /**
   * Format field value
   */
  private formatValue(value: any, field: any): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (field.isCurrency) {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    if (field.isDate) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB');
      }
    }

    return value.toString();
  }

  /**
   * Format label
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
