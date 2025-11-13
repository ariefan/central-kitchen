import { useCallback } from 'react';
import * as XLSX from 'xlsx';

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  columns: ExcelColumn[];
}

/**
 * Custom hook for exporting data to Excel
 * Supports both data export and template generation
 */
export function useExcelExport<T extends Record<string, any>>() {
  /**
   * Export data to Excel file
   */
  const exportToExcel = useCallback(
    (data: T[], options: ExcelExportOptions) => {
      const {
        filename = 'export.xlsx',
        sheetName = 'Sheet1',
        columns,
      } = options;

      // Transform data to match column structure
      const exportData = data.map((item) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          // Handle nested keys (e.g., "category.name")
          const keys = col.key.split('.');
          let value = item;
          for (const key of keys) {
            value = value?.[key];
          }
          row[col.header] = value ?? '';
        });
        return row;
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = columns.map((col) => ({
        wch: col.width || 20,
      }));
      ws['!cols'] = colWidths;

      // Create workbook and append worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate Excel file and trigger download
      XLSX.writeFile(wb, filename);
    },
    []
  );

  /**
   * Export selected items to Excel
   */
  const exportSelected = useCallback(
    (data: T[], selectedIds: Set<string | number>, options: ExcelExportOptions, idKey: string = 'id') => {
      const selectedData = data.filter((item) => selectedIds.has(item[idKey]));
      exportToExcel(selectedData, options);
    },
    [exportToExcel]
  );

  /**
   * Generate and download an Excel template with headers only
   */
  const downloadTemplate = useCallback(
    (options: ExcelExportOptions) => {
      const {
        filename = 'template.xlsx',
        sheetName = 'Template',
        columns,
      } = options;

      // Create empty row with just headers
      const headers: Record<string, string> = {};
      columns.forEach((col) => {
        headers[col.header] = '';
      });

      // Create worksheet with just headers
      const ws = XLSX.utils.json_to_sheet([headers]);

      // Set column widths
      const colWidths = columns.map((col) => ({
        wch: col.width || 20,
      }));
      ws['!cols'] = colWidths;

      // Create workbook and append worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate Excel file and trigger download
      XLSX.writeFile(wb, filename);
    },
    []
  );

  /**
   * Parse Excel file and return data
   */
  const parseExcelFile = useCallback(
    async (file: File, columns: ExcelColumn[]): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Transform data to match expected structure
            const parsedData = jsonData.map((row: any) => {
              const item: Record<string, any> = {};
              columns.forEach((col) => {
                const value = row[col.header];
                // Handle nested keys
                const keys = col.key.split('.');
                let current = item;
                for (let i = 0; i < keys.length - 1; i++) {
                  if (!current[keys[i]]) {
                    current[keys[i]] = {};
                  }
                  current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = value ?? '';
              });
              return item as T;
            });

            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
      });
    },
    []
  );

  return {
    exportToExcel,
    exportSelected,
    downloadTemplate,
    parseExcelFile,
  };
}
