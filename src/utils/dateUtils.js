/**
 * Date Formatting Utilities
 * Handles consistent date formatting across the application
 */

/**
 * Format date as MM/DD/YYYY
 * @param {string} dateString - The date string (ISO format YYYY-MM-DD or Date object)
 * @returns {string} Formatted date in MM/DD/YYYY format
 */
export const formatDate = (dateString) => {
  if (!dateString) return "";

  let date;

  // Handle both string dates and Date objects
  if (dateString instanceof Date) {
    date = dateString;
  } else {
    date = new Date(dateString);
  }

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return dateString; // Return original if invalid
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
};

/**
 * Parse a MM/DD/YYYY date string to ISO format (YYYY-MM-DD)
 * @param {string} dateString - MM/DD/YYYY formatted date string
 * @returns {string} ISO formatted date YYYY-MM-DD
 */
export const parseDate = (dateString) => {
  if (!dateString) return "";

  // If already in ISO format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  const parts = dateString.split("/");
  if (parts.length !== 3) return dateString;

  // MM/DD/YYYY to YYYY-MM-DD
  return `${parts[2]}-${parts[0]}-${parts[1]}`;
};

/**
 * Format time in 12-hour format with AM/PM
 * @param {string} timeString - Time in 24-hour format (HH:MM)
 * @returns {string} Time in 12-hour format with AM/PM
 */
export const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return "";

  // If already in 12-hour format with AM/PM, return as is
  if (/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?[APap][Mm]$/.test(timeString)) {
    return timeString;
  }

  // Parse the 24-hour time
  const timeParts = timeString.split(":");
  if (timeParts.length !== 2) return timeString;

  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];
  const period = hours >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert '0' to '12'

  return `${hours}:${minutes} ${period}`;
};

/**
 * Parse 12-hour time format to 24-hour format
 * @param {string} timeString - Time in 12-hour format (h:mm AM/PM)
 * @returns {string} Time in 24-hour format (HH:MM)
 */
export const parseTimeTo24Hour = (timeString) => {
  if (!timeString) return "";

  // If already in 24-hour format, return as is
  if (/^([01]\d|2[0-3]):[0-5][0-9]$/.test(timeString)) {
    return timeString;
  }

  // Parse the 12-hour time with AM/PM
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s?([APap][Mm])$/);
  if (!match) return timeString;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === "PM" && hours < 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

/**
 * Format date and time in 12-hour format (MM/DD/YYYY h:mm AM/PM)
 * @param {object} dateTimeObj - Object containing date, time, and/or timestamp
 * @param {string} dateTimeObj.date - Date string (YYYY-MM-DD or MM/DD/YYYY)
 * @param {string} [dateTimeObj.time] - Time string (HH:MM or h:mm AM/PM)
 * @param {number} [dateTimeObj.timestamp] - Unix timestamp
 * @returns {string} Formatted date and time in MM/DD/YYYY h:mm AM/PM format
 */
export const formatDateTime = (dateTimeObj) => {
  if (!dateTimeObj) return "";

  let date;

  // Prefer timestamp if available
  if (dateTimeObj.timestamp) {
    date = new Date(dateTimeObj.timestamp);
  } else if (dateTimeObj.date) {
    // Try parsing with date and time
    if (dateTimeObj.time) {
      // Attempt to parse combined date and time string
      const combinedDateTimeString = `${dateTimeObj.date} ${dateTimeObj.time}`;
      date = new Date(combinedDateTimeString);
    } else {
      // Just parse the date
      date = new Date(dateTimeObj.date);
    }
  }

  // Check if date is valid
  if (isNaN(date.getTime())) {
    // If invalid, try parsing just the date string as a fallback
    date = new Date(dateTimeObj.date);
    if (isNaN(date.getTime())) {
      return dateTimeObj.date || ""; // Return original date or empty if still invalid
    }
    // If date is valid but time wasn't parsed, just format the date
    return formatDate(date);
  }

  const formattedDate = formatDate(date);

  // Format time in 12-hour format
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert '0' to '12'

  return `${formattedDate} ${hours}:${minutes}${period}`;
};

/**
 * Convert a date input to display format (MM/DD/YYYY)
 * For use when retrieving a date from an HTML date input
 * and displaying it in the UI
 *
 * @param {string} isoDate - The date in ISO format (YYYY-MM-DD)
 * @returns {string} - Date in MM/DD/YYYY format
 */
export const inputToDisplayDate = (isoDate) => {
  return formatDate(isoDate);
};

/**
 * Convert a display format date (MM/DD/YYYY) to ISO format (YYYY-MM-DD)
 * For use when submitting a date to the server or storing in the database
 *
 * @param {string} displayDate - The date in MM/DD/YYYY format
 * @returns {string} - Date in ISO format YYYY-MM-DD
 */
export const displayToInputDate = (displayDate) => {
  return parseDate(displayDate);
};

/**
 * Format date and time in a clean readable format (YYYY MMM D, HH:MMAM/PM)
 * @param {string|Date} dateTime - Date string or Date object
 * @returns {string} Formatted date and time like "2026 Feb 7, 3:30PM"
 */
export const formatDateTimeClean = (dateTime) => {
  if (!dateTime) return "";

  const date = new Date(dateTime);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return dateTime;
  }

  // Month names
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const year = date.getFullYear();
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  // Format time in 12-hour format
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert '0' to '12'

  return `${year} ${month} ${day}, ${hours}:${minutes}${period}`;
};

/**
 * Standardize patient dates to ensure all dates are in MM/DD/YYYY format
 * @param {Object} patient - Patient object
 * @returns {Object} - Patient object with standardized dates
 */
export const standardizePatientDates = (patient) => {
  if (!patient) return patient;

  const standardizedPatient = { ...patient };

  // Standardize date of birth
  if (standardizedPatient.dob) {
    // Store the original ISO format for form inputs
    standardizedPatient.dobIso = parseDate(standardizedPatient.dob);
    // Store the formatted display version
    standardizedPatient.dob = formatDate(standardizedPatient.dob);
  }

  // Standardize last visit date
  if (standardizedPatient.lastVisit) {
    standardizedPatient.lastVisit = formatDate(standardizedPatient.lastVisit);
  }

  // Standardize visit dates if they exist
  if (standardizedPatient.visits && Array.isArray(standardizedPatient.visits)) {
    standardizedPatient.visits = standardizedPatient.visits.map((visit) => {
      if (visit.date) {
        return {
          ...visit,
          date: formatDate(visit.date),
        };
      }
      return visit;
    });
  }

  return standardizedPatient;
};

/**
 * Standardize an array of patients to ensure all dates are in MM/DD/YYYY format
 * @param {Array} patients - Array of patient objects
 * @returns {Array} - Array of patient objects with standardized dates
 */
export const standardizePatientsList = (patients) => {
  if (!patients || !Array.isArray(patients)) return patients;
  return patients.map((patient) => standardizePatientDates(patient));
};

export default {
  formatDate,
  parseDate,
  formatTimeTo12Hour,
  parseTimeTo24Hour,
  formatDateTime,
  formatDateTimeClean,
  inputToDisplayDate,
  displayToInputDate,
  standardizePatientDates,
  standardizePatientsList,
};
