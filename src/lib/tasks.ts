/**
 * Task age calculation utilities
 */

export interface TaskAgeResult {
  days: number;
  color: string;
  label: string;
  borderColor: string;
}

const AGE_COLORS = {
  green: '#154733',
  yellow: '#FEE123',
  red: '#DC2626',
} as const;

/**
 * Calculate how long a task has been in its current column
 * 
 * @param task - Task object with timestamps
 * @param column - Current column (status)
 * @returns Age calculation with color coding
 */
export function getTaskAge(
  task: { 
    createdAt: string; 
    updatedAt: string; 
    movedAt?: string;
    column?: string;
  },
  column?: string
): TaskAgeResult {
  // Determine the timestamp to use for age calculation
  // Priority: movedAt > updatedAt > createdAt
  const timestamp = task.movedAt || task.updatedAt || task.createdAt;
  
  // Calculate age in milliseconds
  const now = new Date();
  const taskDate = new Date(timestamp);
  const ageMs = now.getTime() - taskDate.getTime();
  
  // Convert to days (rounded to 1 decimal)
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  
  // Determine color based on thresholds
  let color: string;
  let borderColor: string;
  let label: string;
  
  if (ageDays < 1) {
    // Green: less than 1 day
    color = AGE_COLORS.green;
    borderColor = AGE_COLORS.green;
    
    // Calculate hours for sub-day display
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    if (ageHours === 0) {
      const ageMinutes = Math.floor(ageMs / (1000 * 60));
      label = ageMinutes < 2 ? 'just now' : `${ageMinutes}m`;
    } else {
      label = `${ageHours}h`;
    }
  } else if (ageDays <= 3) {
    // Yellow: 1-3 days
    color = AGE_COLORS.yellow;
    borderColor = AGE_COLORS.yellow;
    label = `${ageDays}d`;
  } else {
    // Red: more than 3 days
    color = AGE_COLORS.red;
    borderColor = AGE_COLORS.red;
    label = `${ageDays}d`;
  }
  
  return {
    days: ageDays,
    color,
    label,
    borderColor,
  };
}

/**
 * Get a CSS class name for the age-based border color
 */
export function getAgeBorderClass(age: TaskAgeResult): string {
  if (age.days < 1) return 'border-l-[#154733]';
  if (age.days <= 3) return 'border-l-[#FEE123]';
  return 'border-l-[#DC2626]';
}

/**
 * Get a CSS class name for the age label text color
 */
export function getAgeTextClass(age: TaskAgeResult): string {
  if (age.days < 1) return 'text-[#154733]';
  if (age.days <= 3) return 'text-[#FEE123]';
  return 'text-[#DC2626]';
}
