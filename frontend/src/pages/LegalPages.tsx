import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { publicBusinessInfo } from "../siteConfig";

type Section = { title: string; paragraphs: string[]; bullets?: string[] };
type Policy = { title: string; intro: string; sections: Section[] };

const updated = "November 19, 2026";
const policies: Record<string, Policy> = {
  "/terms-of-service": {
    title: "Terms and Conditions",
    intro: "These terms apply when you use WS Hub, create an account, publish a business listing, or make a payment on the platform.",
    sections: [
      { title: "1. About WS Hub", paragraphs: [`WS Hub is an online directory and community platform operated by ${publicBusinessInfo.legalName}. It helps people discover businesses and connect with founders, investors, mentors, and other members. WS Hub does not endorse or independently guarantee the products, services, claims, or performance of listed businesses.`] },
      { title: "2. Accounts and access", paragraphs: ["You must provide accurate account information, keep your login credentials secure, and use the platform lawfully. New accounts and business listings may be subject to review and approval. You are responsible for activity carried out through your account."] },
      { title: "3. Business listings and fees", paragraphs: ["Creating a business draft is free. A one-time fee of ₹2 is charged for each business listing when you choose to publish it. The listing remains private until the payment is successfully verified and publishing is completed. The fee is for the digital listing service and is not a recurring subscription.", "You are responsible for the accuracy of your listing, your right to publish uploaded images and content, and responding to enquiries made to your business. WS Hub may hide or remove content that is unlawful, misleading, infringing, or otherwise violates these terms."] },
      { title: "4. Payments", paragraphs: ["Payments are processed through Razorpay. WS Hub does not collect or store card, UPI, or net-banking credentials. Payment status is confirmed using the payment provider's response. The Refund and Cancellation Policy explains how payment issues are handled."] },
      { title: "5. Acceptable use", bullets: ["Do not impersonate another person or business.", "Do not submit false, unlawful, harmful, or misleading information.", "Do not upload content unless you have permission to use it.", "Do not interfere with the security or operation of WS Hub or attempt unauthorized access." ] },
      { title: "6. Availability and changes", paragraphs: ["We may update or temporarily suspend parts of the platform for maintenance, security, or operational reasons. We may update these terms by publishing a revised version on this page. The date above indicates the latest revision."] },
      { title: "7. Contact", paragraphs: [`For questions about these terms, contact ${publicBusinessInfo.legalName} using the contact details on our Contact Us page.`] },
    ],
  },
  "/terms-and-conditions": { title: "Terms and Conditions", intro: "These terms apply when you use WS Hub, create an account, publish a business listing, or make a payment on the platform.", sections: [] },
  "/refund-policy": {
    title: "Refund and Cancellation Policy",
    intro: "This policy applies to the ₹2 one-time digital business listing fee charged by WS Hub through Razorpay.",
    sections: [
      { title: "1. Cancel before payment", paragraphs: ["You can leave a business listing as a private draft and cancel the checkout before completing payment. No fee is charged when a payment is not completed."] },
      { title: "2. When a refund may be requested", paragraphs: ["The listing fee is generally non-refundable after the listing has been successfully published, because the digital listing service has been provided. Contact us if you were charged more than once for the same listing, your payment succeeded but the listing was not published, or the transaction was otherwise processed incorrectly. We will review the payment and listing records before deciding the request."] },
      { title: "3. How to request help", paragraphs: [`Email ${publicBusinessInfo.supportEmail} with the account email, business name, approximate payment date, amount, and Razorpay payment or order reference. Do not send full card numbers, UPI PINs, passwords, or other payment credentials. We may ask for reasonable transaction details to verify the request.`] },
      { title: "4. Refund processing", paragraphs: ["If a refund is approved, WS Hub will initiate it to the original payment method within 5–7 business days after verification. The bank, card issuer, or payment provider may take additional time to post the credit. We will share the refund reference when available."] },
      { title: "5. Payment status", paragraphs: ["If your bank shows a debit but WS Hub shows the payment as pending or failed, please allow the payment provider time to update the transaction, then contact us with the transaction reference. Do not retry repeatedly while the first transaction is still being confirmed."] },
    ],
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    intro: "This policy explains how WS Hub handles information when you browse the site, register, manage a profile, or publish a business listing.",
    sections: [
      { title: "1. Information we collect", bullets: ["Account information such as name, email address, phone number, member type, and account status.", "Profile and business information you choose to submit, including descriptions, contact details, location, social links, portfolio content, and uploaded images.", "Payment records such as order and payment references, amount, currency, and status. Payment credentials are handled by Razorpay and are not stored by WS Hub.", "Basic technical and security information needed to operate and protect the service." ] },
      { title: "2. How we use information", paragraphs: ["We use information to create and secure accounts, operate profiles and business listings, process and verify listing payments, provide support, prevent abuse, and meet legal or accounting obligations. Information shown on a public profile or published business listing is visible to site visitors according to the fields you submit and the listing status."] },
      { title: "3. Service providers", paragraphs: ["We use Supabase for account and application data, and Razorpay to process payments. These providers process information needed to deliver their services under their own terms and privacy notices. We do not sell personal information."] },
      { title: "4. Storage and security", paragraphs: ["We use reasonable technical and organizational safeguards. No online service can guarantee absolute security. Do not share passwords, one-time codes, card numbers, or UPI PINs with WS Hub."] },
      { title: "5. Retention and your choices", paragraphs: ["We retain information for as long as needed to provide the service, maintain transaction records, resolve disputes, and meet legal obligations. You can update profile and business information through the available account pages. For access, correction, or deletion requests, contact us using the details on the Contact Us page; some records may need to be retained for legal or payment-accounting purposes."] },
      { title: "6. Changes and contact", paragraphs: [`We may update this policy by posting a new version here. For privacy questions or requests, email ${publicBusinessInfo.supportEmail}.`] },
    ],
  },
  "/about-us": {
    title: "About WS Hub",
    intro: "WS Hub is a Warangal-focused platform for discovering local businesses and connecting the region's founders, investors, mentors, and community members.",
    sections: [
      { title: "What the platform does", paragraphs: ["Members can create profiles, and business owners can create a business profile with contact information, products, services, gallery images, and achievements. Paid business listings become public after the listing fee is confirmed and publishing is completed."] },
      { title: "Our role", paragraphs: ["WS Hub provides discovery and profile tools. A listing is not a certification, endorsement, or guarantee of a business or its offerings. Please contact a business directly to confirm its details before making a purchase or commitment."] },
      { title: "Operator", paragraphs: [`${publicBusinessInfo.legalName} · ${publicBusinessInfo.operatingRegion}`] },
    ],
  },
  "/contact-us": {
    title: "Contact Us",
    intro: "Contact WS Hub for account, business listing, payment, refund, or privacy questions.",
    sections: [
      { title: "Customer support", paragraphs: [`Email: ${publicBusinessInfo.supportEmail}`, `Phone: ${publicBusinessInfo.supportPhone}`, `Operating region: ${publicBusinessInfo.operatingRegion}`, `Business correspondence address: ${publicBusinessInfo.businessAddress || "Full address not provided yet."}`] },
      { title: "Payment and refund enquiries", paragraphs: ["Include your account email, business name, and the Razorpay order or payment reference so we can locate the transaction. Never include card numbers, UPI PINs, passwords, or one-time passcodes."] },
      { title: "Support hours", paragraphs: ["We aim to respond to support enquiries within 2 business days. Payment investigations may take longer when confirmation from a bank or payment provider is required."] },
    ],
  },
  "/shipping-policy": {
    title: "Shipping and Delivery Policy",
    intro: "WS Hub currently provides online profiles and business listing services. It does not sell or ship physical goods.",
    sections: [
      { title: "Digital service delivery", paragraphs: ["The ₹2 business listing fee pays for a digital listing. After successful payment verification and completion of required profile details, the listing is published online. No physical product, parcel, or courier delivery is included."] },
      { title: "If a listing does not appear", paragraphs: ["If your payment is confirmed but your listing is not visible, contact us with the business name and payment reference. See the Refund and Cancellation Policy for payment issue handling."] },
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const policy = policies[pathname];
  const title = policy?.title ?? "Policy";
  useEffect(() => { document.title = `${title} — WS Hub`; }, [title]);
  if (!policy) return null;
  const sections = pathname === "/terms-and-conditions" ? policies["/terms-of-service"].sections : policy.sections;

  return <main className="page-in mx-auto max-w-[900px] px-4 py-10 sm:px-6 lg:px-8">
    <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-navy-700 hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Back to WS Hub</Link>
    <header className="mt-5 rounded-2xl bg-navy-900 px-6 py-8 text-white sm:px-9"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-gold-400">WS Hub · {publicBusinessInfo.legalName}</p><h1 className="mt-2 text-[30px] font-black sm:text-[36px]">{policy.title}</h1><p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-white/80">{policy.intro}</p><p className="mt-4 text-[11px] text-white/60">Last updated: {updated}</p></header>
    <div className="mt-6 rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-8">
      <div className="space-y-7">{sections.map((section) => <section key={section.title}><h2 className="text-[16px] font-bold text-navy-900">{section.title}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-2 text-[13px] leading-7 text-slate-700">{paragraph}</p>)}{section.bullets && <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-700">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}</div>
      {pathname === "/contact-us" && <div className="mt-7 grid gap-3 border-t border-line pt-5 sm:grid-cols-3"><a href={`mailto:${publicBusinessInfo.supportEmail}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-50 p-3 text-[12px] font-semibold text-navy-800"><Mail className="h-4 w-4" />Email support</a><a href={`tel:${publicBusinessInfo.supportPhone}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-50 p-3 text-[12px] font-semibold text-navy-800"><Phone className="h-4 w-4" />Call support</a><span className="inline-flex items-center gap-2 rounded-lg bg-navy-50 p-3 text-[12px] font-semibold text-navy-800"><MapPin className="h-4 w-4" />{publicBusinessInfo.operatingRegion}</span></div>}
    </div>
    <nav aria-label="Policies" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold"><Link className="text-navy-700 hover:underline" to="/terms-of-service">Terms</Link><Link className="text-navy-700 hover:underline" to="/privacy-policy">Privacy</Link><Link className="text-navy-700 hover:underline" to="/refund-policy">Refunds</Link><Link className="inline-flex items-center gap-1 text-navy-700 hover:underline" to="/contact-us">Contact <ArrowRight className="h-3.5 w-3.5" /></Link></nav>
  </main>;
}
