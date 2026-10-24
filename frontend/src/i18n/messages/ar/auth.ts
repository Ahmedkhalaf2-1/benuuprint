import type { Messages } from "..";

export const auth: Messages["auth"] = {
  email: "البريد الإلكتروني",
  hidePassword: "إخفاء كلمة المرور",
  password: "كلمة المرور",
  referenceRequestid: "المرجع: {requestId}",
  showPassword: "إظهار كلمة المرور",
  signIn: "تسجيل الدخول",
  signingIn: "جارٍ تسجيل الدخول…",
  staffSignIn: "تسجيل دخول الموظفين",
  tooManySignInAttempts: "محاولات تسجيل دخول كثيرة. يُرجى الانتظار لحظة.",
  tooManySignInAttemptsSeconds: "محاولات تسجيل دخول كثيرة. حاول مجددًا بعد {seconds} ثانية.",
  yourSessionExpiredPleaseSignIn: "انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى.",
};
