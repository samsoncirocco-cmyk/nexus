'use client';

import { useState } from 'react';
import { format, addDays, addWeeks } from 'date-fns';

interface SchedulePickerProps {
  onSchedule: (date: Date, recurring: string | null) => void;
  onCancel: () => void;
  initialDate?: Date;
}

export function SchedulePicker({ onSchedule, onCancel, initialDate }: SchedulePickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [recurring, setRecurring] = useState<string | null>(null);

  const quickOptions = [
    { label: 'Tomorrow', value: addDays(new Date(), 1) },
    { label: 'Next Week', value: addWeeks(new Date(), 1) },
    { label: 'Next Monday', value: getNextMonday() },
  ];

  const recurringOptions = [
    { label: 'One-time', value: null },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  function getNextMonday() {
    const date = new Date();
    const day = date.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    return addDays(date, diff);
  }

  const handleSchedule = () => {
    if (!selectedDate) return;
    const date = new Date(selectedDate);
    onSchedule(date, recurring);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200 w-80">
      <h3 className="text-lg font-semibold mb-4">Schedule Post</h3>

      {/* Quick Options */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-2">
          {quickOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => setSelectedDate(format(option.value, "yyyy-MM-dd'T'HH:mm"))}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date/Time Picker */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date & Time
        </label>
        <input
          type="datetime-local"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Recurring Options */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Repeat
        </label>
        <select
          value={recurring || ''}
          onChange={(e) => setRecurring(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {recurringOptions.map((option) => (
            <option key={option.label} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSchedule}
          disabled={!selectedDate}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Schedule
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SchedulePicker;
