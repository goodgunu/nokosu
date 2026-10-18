import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

// OAuthの戻り先。signInUrl/signUpUrl を入れないと、Clerkの Account Portal
// (*.accounts.dev) のホストUIに落ちる。アプリ内の / に戻す。
export default function SsoCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/"
      signUpUrl="/"
      continueSignUpUrl="/"
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      transferable
    />
  );
}
