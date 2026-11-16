import "server-only";
import { db } from "@/lib/db";

/**
 * Records that a person agreed to receive promotions (WhatsApp / SMS / email).
 * Saves when and where they agreed, as proof under the Israeli anti-spam law.
 * Re-consenting after an opt-out clears the opt-out.
 */
export async function recordMarketingConsent(p: { email: string; firstName: string; lastName: string; phone: string; source: string }) {
  const now = new Date();
  return db.customer.upsert({
    where: { email: p.email },
    update: { marketingConsent: true, consentAt: now, consentSource: p.source, unsubscribedAt: null, phone: p.phone || undefined },
    create: {
      email: p.email,
      firstName: p.firstName || "-",
      lastName: p.lastName || "-",
      phone: p.phone || null,
      marketingConsent: true,
      consentAt: now,
      consentSource: p.source,
    },
  });
}
