interface Window {
  catalyst: {
    auth: {
      isUserAuthenticated(): Promise<{
        content: {
          user_id: string;
          email_id: string;
          first_name: string;
          last_name: string;
          role_details?: {
            role_id: string;
            role_name: string;
          };
        };
      }>;
      signOut(redirectURL?: string): void;
    };
  };
}
