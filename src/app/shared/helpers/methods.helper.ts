export function floorToTwoDecimals(value: string | number): string | null {
  if (value === null || value === undefined) return null;
  
  const num = Number(value);
  if (isNaN(num)) return null;
  
  return num.toFixed(2);
}


export const formatTo12Hour = (dateValue: string | Date): string => {
  if (!dateValue) return '';
  
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12 || 12; // Convert to 12-hour format
  const hoursStr = String(hours).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
};