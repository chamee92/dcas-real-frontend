import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates a phone number with strict length and format checks.
 * Supports Sri Lankan numbers (07XXXXXXXX, +947XXXXXXXX, 947XXXXXXXX, 7XXXXXXXX)
 * and International numbers (+XXXXXXXXXXX, 00XXXXXXXXXXX).
 *
 * @param phone The phone number string to validate
 * @param required Whether the field is required
 * @param isSriLanka Whether the selected country is Sri Lanka or if SL rules should apply
 * @returns Error string if invalid, empty string if valid
 */
export function validatePhoneNumber(
  phone: string,
  required = false,
  isSriLanka = false
): string {
  const trimmed = (phone || "").trim();
  if (!trimmed) {
    if (required) return "Contact Number is required.";
    return "";
  }

  // Remove spaces, dashes, parentheses
  const clean = trimmed.replace(/[\s\-()]/g, "");

  // Must only contain digits and optional leading '+'
  if (!/^\+?[0-9]+$/.test(clean)) {
    return "Phone number can only contain digits and an optional leading '+'.";
  }

  // Check if it's a Sri Lankan format number
  // Sri Lankan numbers can start with '+94', '0094', '94' (11 digits), '0' (10 digits), or '7' (9 digits)
  // Or if the selected country is Sri Lanka
  const hasSlPrefix =
    clean.startsWith("+94") ||
    clean.startsWith("0094") ||
    (clean.startsWith("94") && !clean.startsWith("+")) ||
    clean.startsWith("0");

  if (isSriLanka || hasSlPrefix) {
    // 1. +94 format
    if (clean.startsWith("+94")) {
      const rest = clean.substring(3);
      if (rest.startsWith("0")) {
        return "Please remove the leading '0' after +94 (e.g. +94771234567).";
      }
      if (rest.length !== 9) {
        return `Sri Lankan number with +94 must have exactly 9 digits after +94 (e.g. +94771234567). You entered ${rest.length} digits.`;
      }
      return "";
    }

    // 2. 0094 format
    if (clean.startsWith("0094")) {
      const rest = clean.substring(4);
      if (rest.startsWith("0")) {
        return "Please remove the leading '0' after 0094 (e.g. 0094771234567).";
      }
      if (rest.length !== 9) {
        return `Sri Lankan number with 0094 must have exactly 9 digits after 0094. You entered ${rest.length} digits.`;
      }
      return "";
    }

    // 3. 94 format (without +)
    if (clean.startsWith("94") && !clean.startsWith("+")) {
      const rest = clean.substring(2);
      if (rest.startsWith("0")) {
        return "Please remove the leading '0' after 94 (e.g. 94771234567).";
      }
      if (rest.length !== 9) {
        return `Sri Lankan number starting with 94 must have exactly 9 digits after 94 (11 digits total). You entered ${clean.length} digits.`;
      }
      return "";
    }

    // 4. Starting with 0 (local SL format, e.g. 0771234567, 0112345678)
    if (clean.startsWith("0")) {
      if (clean.length !== 10) {
        return `Sri Lankan phone number starting with 0 must be exactly 10 digits (e.g. 0771234567). You entered ${clean.length} digits.`;
      }
      return "";
    }

    // 5. 9 digits without leading 0 (e.g. 771234567)
    if (clean.length === 9) {
      return "";
    }

    // If country is Sri Lanka and entered something else (e.g. 10 digits starting with 7 like 7660020222)
    if (clean.length === 10 && !clean.startsWith("0")) {
      return "Sri Lankan number without leading 0 must be 9 digits (e.g. 771234567) or 10 digits starting with 0 (e.g. 0771234567).";
    }

    return "Sri Lankan phone number must be 10 digits (e.g. 0771234567) or +94 followed by 9 digits.";
  }

  // International phone number validation (E.164: 7 to 15 digits)
  if (clean.startsWith("+")) {
    const digits = clean.substring(1);
    if (digits.length < 7 || digits.length > 15) {
      return "International phone number must be between 7 and 15 digits.";
    }
    return "";
  }

  if (clean.startsWith("00")) {
    const digits = clean.substring(2);
    if (digits.length < 7 || digits.length > 15) {
      return "International phone number must be between 7 and 15 digits.";
    }
    return "";
  }

  // General fallback
  if (clean.length < 7 || clean.length > 15) {
    return "Phone number must be between 7 and 15 digits.";
  }

  return "";
}

/**
 * Cleans whitespace and formatting from phone numbers for the API, preserving the entered format.
 */
export function formatPhoneNumberForApi(phone: string): string {
  if (!phone) return "";
  return phone.trim().replace(/[\s\-\(\)]/g, "");
}

/**
 * Formats phone numbers for display.
 * If a phone number was saved with international +94 prefix, converts it back to local 0xxxxxxxxx format.
 * Examples:
 * - +94767897864 -> 0767897864
 * - 94767897864 -> 0767897864
 * - 0768768786 -> 0768768786
 * - +447911123456 -> +447911123456
 */
export function formatPhoneNumberForDisplay(phone?: string | null): string {
  if (!phone) return "-";
  const clean = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (!clean) return "-";

  // Sri Lankan number with +94 prefix (e.g. +94771234567 -> 0771234567)
  if (clean.startsWith("+94") && clean.length === 12) {
    return "0" + clean.substring(3);
  }
  // Sri Lankan number with 94 prefix (e.g. 94771234567 -> 0771234567)
  if (clean.startsWith("94") && clean.length === 11) {
    return "0" + clean.substring(2);
  }
  return clean;
}

