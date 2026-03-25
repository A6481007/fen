// Admin utility functions
export const getAdminEmails = (): string[] => {
  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmailsEnv) return [];

  try {
    // Handle array format: [email1,email2] or just comma-separated: email1,email2
    const cleanEmails = adminEmailsEnv
      .replace(/[\[\]]/g, "") // Remove brackets if present
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    return cleanEmails;
  } catch (error) {
    console.error("Error parsing admin emails:", error);
    return [];
  }
};

export const isUserAdmin = (userEmail: string | null | undefined): boolean => {
  if (!userEmail) return false;

  const adminEmails = getAdminEmails();
  return adminEmails.includes(userEmail.toLowerCase());
};

/**
 * Comprehensive admin check that considers both database isAdmin field and environment variable
 * @param user - User object with email and isAdmin fields
 * @returns true if user is admin based on either database flag or environment variable
 */
export const isAdmin = (
  user: { email?: string | null; isAdmin?: boolean } | null | undefined
): boolean => {
  if (!user) return false;

  // Check if user has isAdmin flag set in database
  if (user.isAdmin === true) return true;

  // Fallback to environment variable check
  if (user.email) {
    return isUserAdmin(user.email);
  }

  return false;
};

export const useIsAdmin = (userEmail: string | null | undefined): boolean => {
  return isUserAdmin(userEmail);
};
