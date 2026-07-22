/**
 * The OAuth providers enabled for this app's sign-in/sign-up pages. Kept as
 * a local literal union (instead of importing Clerk's broader OAuthStrategy
 * type from a transitive package path) so the custom auth pages don't
 * depend on @clerk/shared's internal export layout.
 */
export type SupportedOAuthStrategy = "oauth_google" | "oauth_apple" | "oauth_github";
