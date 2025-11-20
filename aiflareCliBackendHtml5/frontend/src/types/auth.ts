export type AuthStatus = {
  status: "logged_in" | "logged_out";
  loggedIn: boolean;
  lastLoginAt?: string;
  pendingLogins?: Array<{ cliId: string }>;
};
