// src/config/features.ts
// Single toggle for the payment gate. Flip PAYMENTS_ENABLED back to true (and
// redeploy) to restore the real Dodo Payments checkout flow — nothing else needs
// to change. While false, LienFormApp renders FreeDownloadButton instead of
// DownloadButton, which generates and downloads the PDF bundle directly in the
// browser with no checkout step, for internal testing/QA only.
export const PAYMENTS_ENABLED = true;
