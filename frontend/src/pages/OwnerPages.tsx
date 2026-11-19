import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, ExternalLink, Globe2, ImagePlus, LoaderCircle, MailCheck, MapPin, Plus, Save, Store, UserRound } from "lucide-react";
import { authApi, businessApi, getAccessToken, homeApi, paymentApi, profileApi, setSession, type Session } from "../api";
import { Field, inputCls, textareaCls } from "../components/ui/Modal";
import { login, useStore, type Role } from "../store";

type ProfileForm = { full_name: string; username: string; bio: string; phone: string; city: string; country: string };
const blankProfile: ProfileForm = { full_name: "", username: "", bio: "", phone: "", city: "", country: "" };

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-gold-800">{eyebrow}</p><h1 className="mt-2 text-[30px] font-black tracking-tight text-navy-900 sm:text-[36px]">{title}</h1><p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-600">{description}</p></div>;
}

function Notice({ children, error = false }: { children: string; error?: boolean }) {
  return <div role={error ? "alert" : "status"} className={`mb-4 rounded-lg px-4 py-3 text-[12.5px] ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{children}</div>;
}

type ListingCheckoutOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill?: { email?: string };
  handler: (result: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};
declare global { interface Window { Razorpay?: new (options: ListingCheckoutOptions) => { open: () => void } } }

async function payListingFee(businessId: string) {
  const checkoutResult = await paymentApi.listingFeeCheckout(businessId);
  const checkout = checkoutResult?.data ?? checkoutResult;
  if (checkout?.paid) return true;
  if (!window.Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay Checkout. Please try again."));
      document.body.appendChild(script);
    });
  }
  if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable.");
  return new Promise<boolean>((resolve, reject) => {
    const checkoutWindow = new window.Razorpay!({
      key: checkout.keyId, amount: checkout.amount, currency: checkout.currency,
      name: checkout.name, description: checkout.description, order_id: checkout.orderId,
      prefill: checkout.prefill,
      handler: async (payment) => {
        try {
          await paymentApi.verify(payment.razorpay_order_id, payment.razorpay_payment_id, payment.razorpay_signature);
          resolve(true);
        } catch (error) { reject(error); }
      },
      modal: { ondismiss: () => resolve(false) },
    });
    checkoutWindow.open();
  });
}

export function EditProfilePage() {
  const user = useStore((state) => state.user);
  const [profile, setProfile] = useState<ProfileForm>(blankProfile);
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Edit profile — WS Hub";
    let current = true;
    profileApi.get().then((result) => {
      const data = result?.profile ?? result ?? {};
      if (current) {
        setProfile({
          full_name: data.full_name || "", username: data.username || "", bio: data.bio || "",
          phone: data.phone || "", city: data.city || data.location || "", country: data.country || "",
        });
        setAvatar(data.avatar_url || "");
      }
    }).catch((reason) => current && setError(reason instanceof Error ? reason.message : "Could not load your profile."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  if (!user && !getAccessToken()) return <Navigate to="/login?next=%2Fprofile%2Fedit" replace />;

  const update = (key: keyof ProfileForm, value: string) => setProfile((old) => ({ ...old, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setError(""); setSaving(true);
    try {
      const result = await profileApi.update({ fullName: profile.full_name.trim(), username: profile.username.trim().toLowerCase(), bio: profile.bio.trim(), phone: profile.phone.trim(), city: profile.city.trim(), country: profile.country.trim() });
      if (result?.full_name) setProfile((old) => ({ ...old, full_name: result.full_name }));
      setMessage("Your profile was saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your profile."); }
    finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError(""); setMessage(""); setUploading(true);
    try {
      const result = await profileApi.uploadAvatar(file);
      setAvatar(result?.avatar_url || result?.profile?.avatar_url || "");
      setMessage("Profile photo updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload your photo."); }
    finally { setUploading(false); }
  };

  return <div className="page-in mx-auto max-w-[1040px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-[12px] font-semibold text-navy-700 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
    <PageHeading eyebrow="Your account" title="Edit your profile" description="Keep your details current so people across the WS Hub community can find and connect with you." />
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
    {loading ? <div className="card flex items-center gap-3 p-6 text-[13px] text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading your profile…</div> : (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={submit} className="card p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-line pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><UserRound className="h-5 w-5" /></span><div><h2 className="text-[15px] font-bold text-navy-900">Public information</h2><p className="text-[11.5px] text-slate-500">Fields marked as required are visible on your profile.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="profile-name"><input id="profile-name" className={inputCls} minLength={2} maxLength={100} required value={profile.full_name} onChange={(event) => update("full_name", event.target.value)} autoComplete="name" /></Field>
            <Field label="Username" htmlFor="profile-username" hint="3–30 characters: lowercase letters, numbers and underscores."><input id="profile-username" className={inputCls} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" required value={profile.username} onChange={(event) => update("username", event.target.value)} autoComplete="username" /></Field>
            <div className="sm:col-span-2"><Field label="About you" htmlFor="profile-bio" hint={`${profile.bio.length}/500`}><textarea id="profile-bio" className={`${textareaCls} min-h-28`} maxLength={500} value={profile.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Share a little about what you do and what you’re looking for." /></Field></div>
            <Field label="Phone" htmlFor="profile-phone"><input id="profile-phone" type="tel" className={inputCls} maxLength={20} value={profile.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" /></Field>
            <Field label="City" htmlFor="profile-city"><input id="profile-city" className={inputCls} maxLength={80} value={profile.city} onChange={(event) => update("city", event.target.value)} autoComplete="address-level2" /></Field>
            <Field label="Country" htmlFor="profile-country"><input id="profile-country" className={inputCls} maxLength={80} value={profile.country} onChange={(event) => update("country", event.target.value)} autoComplete="country-name" /></Field>
          </div>
          <div className="mt-6 flex flex-wrap gap-2"><button className="btn-gold px-5 py-2.5" type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save changes"}</button><Link to="/dashboard" className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">Cancel</Link></div>
        </form>
        <aside className="space-y-4">
          <section className="card p-5"><h2 className="text-[14px] font-bold text-navy-900">Profile photo</h2><p className="mt-1 text-[11.5px] text-slate-500">PNG, JPG, WEBP or GIF · up to 5 MB</p><div className="mt-4 flex items-center gap-3">{avatar ? <img src={avatar} alt="Your profile" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-100 text-navy-700"><UserRound className="h-6 w-6" /></span>}<label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50">{uploading ? "Uploading…" : "Choose photo"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(event) => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div></section>
          <section className="rounded-xl border border-navy-800 bg-navy-900 p-5 text-white"><Building2 className="h-5 w-5 text-gold-400" /><h2 className="mt-3 text-[14px] font-bold">Represent a business?</h2><p className="mt-1.5 text-[12px] leading-relaxed text-white/70">Create a listing and manage its public profile from WS Hub.</p><Link to="/businesses/manage" className="mt-4 inline-flex items-center gap-2 rounded-md bg-gold-500 px-3.5 py-2 text-[11.5px] font-bold text-navy-900 hover:bg-gold-400">Manage businesses <ArrowRight className="h-3.5 w-3.5" /></Link></section>
        </aside>
      </div>
    )}
  </div>;
}

type BusinessItem = { id: string; slug: string; name: string; city?: string; status: string; description?: string; logo_url?: string; listing_fee_paid?: boolean };

export function BusinessManagerPage() {
  const user = useStore((state) => state.user);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { document.title = "Your businesses — WS Hub"; }, []);
  useEffect(() => {
    let current = true;
    businessApi.mine().then((result) => current && setItems(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []))
      .catch((reason) => current && setError(reason instanceof Error ? reason.message : "Could not load your businesses."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [refresh]);
  if (!user && !getAccessToken()) return <Navigate to="/login?next=%2Fbusinesses%2Fmanage" replace />;

  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice(""); setBusy("new");
    try {
      const result = await businessApi.create({ name: name.trim() });
      const business = result?.data?.business ?? result?.data ?? result?.business ?? result;
      window.location.hash = `#/businesses/${encodeURIComponent(business.id)}/edit`;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the business draft."); }
    finally { setBusy(""); }
  };
  const changeStatus = async (item: BusinessItem) => {
    setBusy(item.id); setError(""); setNotice("");
    try {
      if (item.status === "published") await businessApi.unpublish(item.id); else await businessApi.publish(item.id);
      setNotice(item.status === "published" ? "The listing is now a draft." : "Your business is published on WS Hub.");
      setRefresh((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update the listing status."); }
    finally { setBusy(""); }
  };
  const payFee = async (item: BusinessItem) => {
    setBusy(item.id); setError(""); setNotice("");
    try {
      const paid = await payListingFee(item.id);
      if (paid) { setNotice("₹2 fee confirmed. Complete your details and publish when ready."); setRefresh((value) => value + 1); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not complete the listing fee payment."); }
    finally { setBusy(""); }
  };

  return <div className="page-in mx-auto max-w-[1080px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-[12px] font-semibold text-navy-700 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
    <PageHeading eyebrow="Business owner space" title="Your businesses" description="Create a draft, complete your details, and publish your business profile to the WS Hub directory." />
    {error && <Notice error>{error}</Notice>}{notice && <Notice>{notice}</Notice>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-[16px] font-bold text-navy-900">Your listings</h2><p className="mt-1 text-[12px] text-slate-500">Drafts remain private until you publish them.</p></div><span className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-bold text-navy-700">{items.length} / 5</span></div>
        {loading ? <div className="flex items-center gap-2 py-8 text-[12.5px] text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading listings…</div> : items.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-5 py-8 text-center"><Store className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-[13px] font-semibold text-navy-900">No business listings yet</p><p className="mt-1 text-[12px] text-slate-500">Create your first draft to get started.</p></div> : <ul className="mt-4 divide-y divide-line">{items.map((item) => <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3">{item.logo_url ? <img src={item.logo_url} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700"><Building2 className="h-5 w-5" /></span>}<div className="min-w-0"><p className="truncate text-[13.5px] font-bold text-navy-900">{item.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{item.city || "Location not added"} · {item.slug}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize ${item.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{item.status}</span>{!item.listing_fee_paid && <button type="button" disabled={busy === item.id} onClick={() => void payFee(item)} className="rounded-md bg-gold-500 px-3 py-1.5 text-[11.5px] font-bold text-navy-900 hover:bg-gold-400 disabled:opacity-50">{busy === item.id ? "Processing…" : "Pay ₹2 fee"}</button>}<Link to={`/businesses/${encodeURIComponent(item.id)}/edit`} className="rounded-md border border-slate-300 px-3 py-1.5 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50">Edit</Link>{item.status === "published" && <Link to={`/businesses/${encodeURIComponent(item.slug)}`} aria-label={`View ${item.name}`} className="rounded-md border border-slate-300 p-1.5 text-navy-700 hover:bg-navy-50"><ExternalLink className="h-4 w-4" /></Link>}<button type="button" disabled={busy === item.id || (!item.listing_fee_paid && item.status !== "published")} onClick={() => void changeStatus(item)} className="rounded-md bg-navy-800 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-navy-700 disabled:opacity-50">{busy === item.id ? "Saving…" : item.status === "published" ? "Unpublish" : "Publish"}</button></div></li>)}</ul>}
      </section>
      <aside className="h-fit rounded-xl border border-navy-800 bg-navy-900 p-5 text-white sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-400"><Plus className="h-5 w-5" /></span><h2 className="mt-4 text-[16px] font-bold">Add a business</h2><p className="mt-1.5 text-[12px] leading-relaxed text-white/70">Start with a name. You can add contact, location and category details before publishing.</p><form onSubmit={create} className="mt-5 space-y-3"><label htmlFor="new-business-name" className="block text-[11.5px] font-semibold text-white/85">Business name</label><input id="new-business-name" className="h-10 w-full rounded-md border border-white/20 bg-white px-3 text-[13px] text-navy-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-400" minLength={2} maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Warangal Coffee House" /><button type="submit" disabled={busy === "new" || items.length >= 5} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />{busy === "new" ? "Creating…" : "Create draft"}</button>{items.length >= 5 && <p className="text-[11px] text-white/65">You’ve reached the 5 business limit.</p>}</form></aside>
    </div>
    <p className="mt-6 text-[11.5px] text-slate-500">Looking for a public listing? <Link to="/businesses" className="font-semibold text-navy-700 hover:underline">Explore businesses <ArrowRight className="inline h-3 w-3" /></Link></p>
  </div>;
}

type OpeningHours = Record<string, { open?: string; close?: string; closed?: boolean }>;
type BusinessForm = { name: string; description: string; categoryId: string; email: string; phone: string; website: string; address: string; city: string; state: string; country: string; postalCode: string; latitude: string; longitude: string; tags: string; hours: OpeningHours; socialLinks: Record<string, string>; logoUrl: string; coverUrl: string };
type BusinessTextKey = Exclude<keyof BusinessForm, "hours" | "socialLinks">;
const openingDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const socialPlatforms = ["instagram", "facebook", "linkedin", "youtube", "x", "twitter", "tiktok"];
const blankBusiness: BusinessForm = { name: "", description: "", categoryId: "", email: "", phone: "", website: "", address: "", city: "", state: "", country: "", postalCode: "", latitude: "", longitude: "", tags: "", hours: {}, socialLinks: {}, logoUrl: "", coverUrl: "" };

export function EditBusinessPage() {
  const user = useStore((state) => state.user);
  const { id = "" } = useParams();
  const [form, setForm] = useState<BusinessForm>(blankBusiness);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [listingFeePaid, setListingFeePaid] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<"logo" | "cover" | null>(null);
  useEffect(() => {
    document.title = "Edit business — WS Hub";
    let current = true;
    Promise.all([businessApi.getMine(id), homeApi.categories()]).then(([businessResult, categoryResult]) => {
      if (!current) return;
      const business = businessResult?.data?.business ?? businessResult?.data ?? businessResult?.business ?? businessResult ?? {};
      setCategories(Array.isArray(categoryResult?.data) ? categoryResult.data : Array.isArray(categoryResult) ? categoryResult : []);
      setForm({
        ...blankBusiness, name: business.name || "", description: business.description || "", categoryId: business.category_id || business.categoryId || "",
        email: business.email || "", phone: business.phone || "", website: business.website || "", address: business.address || "",
        city: business.city || "", state: business.state || "", country: business.country || "", postalCode: business.postal_code || business.postalCode || "",
        latitude: business.latitude == null ? "" : String(business.latitude), longitude: business.longitude == null ? "" : String(business.longitude),
        tags: Array.isArray(business.tags) ? business.tags.join(", ") : "", hours: business.hours && typeof business.hours === "object" ? business.hours : {},
        socialLinks: business.social_links && typeof business.social_links === "object" ? business.social_links : business.socialLinks && typeof business.socialLinks === "object" ? business.socialLinks : {}, logoUrl: business.logo_url || business.logoUrl || "", coverUrl: business.cover_url || business.coverUrl || "",
      });
      setListingFeePaid(business.listing_fee_paid === true);
    }).catch((reason) => current && setError(reason instanceof Error ? reason.message : "Could not load this business."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [id]);
  if (!user && !getAccessToken()) return <Navigate to={`/login?next=${encodeURIComponent(`/businesses/${id}/edit`)}`} replace />;

  const update = (key: BusinessTextKey, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const updateHours = (day: string, key: "open" | "close" | "closed", value: string | boolean) => setForm((old) => ({ ...old, hours: { ...old.hours, [day]: { ...old.hours[day], [key]: value } } }));
  const updateSocialLink = (platform: string, value: string) => setForm((old) => ({ ...old, socialLinks: { ...old.socialLinks, [platform]: value } }));
  const uploadBusinessImage = async (kind: "logo" | "cover", file?: File) => {
    if (!file) return;
    setError(""); setMessage("");
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setError("Choose a PNG, JPG, WEBP or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("The image must be 5 MB or smaller."); return; }
    setUploadingMedia(kind);
    try {
      const result = kind === "logo" ? await businessApi.uploadLogo(id, file) : await businessApi.uploadCover(id, file);
      const business = result?.data ?? result;
      const imageUrl = kind === "logo" ? business?.logo_url : business?.cover_url;
      if (!imageUrl) throw new Error("The image uploaded, but its URL was not returned.");
      update(kind === "logo" ? "logoUrl" : "coverUrl", imageUrl);
      setMessage(kind === "logo" ? "Business logo uploaded." : "Cover image uploaded.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload this image."); }
    finally { setUploadingMedia(null); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage(""); setMissing([]);
    try {
      await businessApi.update(id, {
        name: form.name.trim(), description: form.description, categoryId: form.categoryId || null, email: form.email || null, phone: form.phone || null,
        website: form.website || null, address: form.address || null, city: form.city || null, state: form.state || null, country: form.country || null,
        postalCode: form.postalCode || null, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), hours: form.hours, socialLinks: Object.fromEntries(Object.entries(form.socialLinks).filter(([, value]) => value.trim())), logoUrl: form.logoUrl || null, coverUrl: form.coverUrl || null,
      });
      setMessage("Business details saved.");
    } catch (reason) {
      const details = (reason as { details?: { missing?: string[] } })?.details;
      setMissing(details?.missing || []);
      setError(reason instanceof Error ? reason.message : "Could not save business details.");
    } finally { setSaving(false); }
  };
  const payFee = async () => {
    setSaving(true); setError(""); setMessage("");
    try { if (await payListingFee(id)) { setListingFeePaid(true); setMessage("₹2 fee confirmed. Your business is ready to publish when the profile is complete."); } }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not complete the listing fee payment."); }
    finally { setSaving(false); }
  };
  const publish = async () => {
    setSaving(true); setError(""); setMessage(""); setMissing([]);
    try { await businessApi.publish(id); setMessage("Your business is now published."); }
    catch (reason) { const details = (reason as { details?: { missing?: string[] } })?.details; setMissing(details?.missing || []); setError(reason instanceof Error ? reason.message : "Could not publish your business."); }
    finally { setSaving(false); }
  };
  const textField = (key: BusinessTextKey, label: string, options: { type?: string; max?: number; placeholder?: string } = {}) => <Field label={label} htmlFor={`business-${key}`}><input id={`business-${key}`} className={inputCls} type={options.type || "text"} maxLength={options.max} placeholder={options.placeholder} value={form[key]} onChange={(event) => update(key, event.target.value)} /></Field>;

  return <div className="page-in mx-auto max-w-[1040px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
    <Link to="/businesses/manage" className="mb-6 inline-flex items-center gap-2 text-[12px] font-semibold text-navy-700 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> Your businesses</Link>
    <PageHeading eyebrow="Business listing" title="Edit business profile" description="Add the details customers need to discover, understand and contact your business." />
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}{missing.length > 0 && <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-[12px] text-amber-900"><p className="font-bold">Complete these fields to publish</p><p className="mt-1">{missing.join(", ")}</p></div>}
    {loading ? <div className="card flex items-center gap-3 p-6 text-[13px] text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading business profile…</div> : <form onSubmit={save} className="space-y-5">
      <section className="card p-5 sm:p-7"><div className="mb-5 flex items-center gap-3 border-b border-line pb-4"><Building2 className="h-5 w-5 text-navy-700" /><div><h2 className="text-[15px] font-bold text-navy-900">Business details</h2><p className="text-[11.5px] text-slate-500">Start with a clear name, category and description.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Business name" htmlFor="business-name"><input id="business-name" className={inputCls} minLength={2} maxLength={120} required value={form.name} onChange={(event) => update("name", event.target.value)} /></Field><Field label="Category" htmlFor="business-category"><select id="business-category" className="select" required value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field><div className="sm:col-span-2"><Field label="Description" htmlFor="business-description" hint={`${form.description.length}/5000`}><textarea id="business-description" className={`${textareaCls} min-h-32`} maxLength={5000} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What does your business do? What makes it useful to customers?" /></Field></div><div className="sm:col-span-2"><Field label="Tags" htmlFor="business-tags" hint="Separate up to 15 tags with commas."><input id="business-tags" className={inputCls} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="e.g. consulting, manufacturing, Warangal" /></Field></div></div></section>
      <section className="card p-5 sm:p-7"><div className="mb-5 flex items-center gap-3 border-b border-line pb-4"><MapPin className="h-5 w-5 text-navy-700" /><div><h2 className="text-[15px] font-bold text-navy-900">Contact and location</h2><p className="text-[11.5px] text-slate-500">At least one contact method is needed before publishing.</p></div></div><div className="grid gap-4 sm:grid-cols-2">{textField("email", "Business email", { type: "email" })}{textField("phone", "Phone", { type: "tel", max: 20 })}{textField("website", "Website", { type: "url", placeholder: "https://example.com" })}<div className="sm:col-span-2">{textField("address", "Street address", { max: 250 })}</div>{textField("city", "City", { max: 80 })}{textField("state", "State", { max: 80 })}{textField("country", "Country", { max: 80 })}{textField("postalCode", "Postal code", { max: 15 })}{textField("latitude", "Latitude", { type: "number" })}{textField("longitude", "Longitude", { type: "number" })}</div></section>
      <section className="card p-5 sm:p-7"><div className="mb-5 flex items-center gap-3 border-b border-line pb-4"><Globe2 className="h-5 w-5 text-navy-700" /><div><h2 className="text-[15px] font-bold text-navy-900">More details</h2><p className="text-[11.5px] text-slate-500">Upload your business images, set opening times, and add social media links.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg border border-line p-4"><p className="text-[12px] font-semibold text-navy-900">Business logo</p><p className="mt-1 text-[11px] text-slate-500">Square image recommended · PNG, JPG, WEBP or GIF · up to 5 MB</p><div className="mt-3 flex items-center gap-3">{form.logoUrl ? <img src={form.logoUrl} alt="Business logo preview" className="h-16 w-16 rounded-lg border border-line object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-navy-50 text-navy-500"><Building2 className="h-6 w-6" /></div>}<label htmlFor="business-logo-upload" className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50 ${uploadingMedia ? "pointer-events-none opacity-60" : ""}`}><ImagePlus className="h-4 w-4" />{uploadingMedia === "logo" ? "Uploading…" : form.logoUrl ? "Change logo" : "Upload logo"}<input id="business-logo-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={!!uploadingMedia} onChange={(event) => { void uploadBusinessImage("logo", event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div><div className="rounded-lg border border-line p-4"><p className="text-[12px] font-semibold text-navy-900">Cover image</p><p className="mt-1 text-[11px] text-slate-500">Wide image recommended · PNG, JPG, WEBP or GIF · up to 5 MB</p>{form.coverUrl ? <img src={form.coverUrl} alt="Business cover preview" className="mt-3 aspect-[3/1] w-full rounded-lg border border-line object-cover" /> : <div className="mt-3 flex aspect-[3/1] items-center justify-center rounded-lg bg-navy-50 text-navy-500"><ImagePlus className="h-6 w-6" /></div>}<label htmlFor="business-cover-upload" className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50 ${uploadingMedia ? "pointer-events-none opacity-60" : ""}`}><ImagePlus className="h-4 w-4" />{uploadingMedia === "cover" ? "Uploading…" : form.coverUrl ? "Change cover" : "Upload cover image"}<input id="business-cover-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={!!uploadingMedia} onChange={(event) => { void uploadBusinessImage("cover", event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></div><div className="sm:col-span-2"><p className="mb-2 text-[12px] font-semibold text-navy-900">Opening hours <span className="font-normal text-slate-500">(leave times blank if not set)</span></p><div className="space-y-2">{openingDays.map((day) => { const schedule = form.hours[day] || {}; return <div key={day} className="grid items-center gap-2 rounded-lg border border-line p-3 sm:grid-cols-[110px_1fr_1fr_auto]"><span className="text-[12px] font-medium capitalize text-slate-700">{day}</span><label className="sr-only" htmlFor={`hours-${day}-open`}>{day} opening time</label><input id={`hours-${day}-open`} type="time" className={inputCls} disabled={schedule.closed} value={schedule.open || ""} onChange={(event) => updateHours(day, "open", event.target.value)} /><label className="sr-only" htmlFor={`hours-${day}-close`}>{day} closing time</label><input id={`hours-${day}-close`} type="time" className={inputCls} disabled={schedule.closed} value={schedule.close || ""} onChange={(event) => updateHours(day, "close", event.target.value)} /><label className="flex items-center gap-2 text-[11.5px] text-slate-600"><input type="checkbox" checked={schedule.closed === true} onChange={(event) => updateHours(day, "closed", event.target.checked)} /> Closed</label></div>; })}</div></div><div className="sm:col-span-2"><p className="mb-2 text-[12px] font-semibold text-navy-900">Social media links</p><div className="grid gap-3 sm:grid-cols-2">{[...new Set([...socialPlatforms, ...Object.keys(form.socialLinks)])].map((platform) => <Field key={platform} label={platform === "x" ? "X (Twitter)" : platform[0].toUpperCase() + platform.slice(1)} htmlFor={`social-${platform}`}><input id={`social-${platform}`} type="url" className={inputCls} value={form.socialLinks[platform] || ""} onChange={(event) => updateSocialLink(platform, event.target.value)} placeholder="https://…" /></Field>)}</div></div></div></section>
      <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/businesses/manage" className="text-[12px] font-semibold text-slate-600 hover:text-navy-800">Cancel</Link><div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className="btn-gold px-5 py-2.5"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save draft"}</button>{!listingFeePaid && <button type="button" disabled={saving} onClick={() => void payFee()} className="btn-gold px-5 py-2.5">{saving ? "Processing…" : "Pay ₹2 listing fee"}</button>}<button type="button" disabled={saving || !listingFeePaid} onClick={() => void publish()} className="btn-navy px-5 py-2.5"><BadgeCheck className="h-4 w-4" />Publish listing</button></div></div>
    </form>}
  </div>;
}

function callbackParams() {
  const params = new URLSearchParams(window.location.search);
  const routeQuery = window.location.hash.split("?")[1]?.split("#")[0] || "";
  const tokenFragment = window.location.hash.split("#").slice(2).join("#");
  for (const [key, value] of new URLSearchParams(routeQuery)) if (!params.has(key)) params.set(key, value);
  for (const [key, value] of new URLSearchParams(tokenFragment)) if (!params.has(key)) params.set(key, value);
  return params;
}

export function EmailVerifiedPage() {
  const [status, setStatus] = useState<"checking" | "verified" | "error">("checking");
  const [message, setMessage] = useState("Confirming your email address…");
    const [awaitingApproval, setAwaitingApproval] = useState(false);
  useEffect(() => {
    document.title = "Email confirmed — WS Hub";
    let active = true;
    const confirm = async () => {
      let approvalPending = false;
      const params = callbackParams();
      const token = params.get("access_token");
      const errorDescription = params.get("error_description");
      if (errorDescription) throw new Error(errorDescription.replace(/\+/g, " "));
      if (token) {
        const expiresIn = Number(params.get("expires_in")) || 3600;
        const expiresAt = Number(params.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn;
        setSession({ access_token: token, refresh_token: params.get("refresh_token") || "", expires_in: expiresIn, expires_at: expiresAt, token_type: params.get("token_type") || "bearer" } as Session);
        const result = await authApi.me();
        const profile = result?.profile || {};
        if (profile.role === "admin" || profile.approval_status === "approved") {
          const role: Role = profile.role === "admin" ? "Admin" : profile.role === "business_owner" ? "Business" : "Founder";
          login({ name: profile.full_name || result.email?.split("@")[0] || "WS Hub member", email: result.email || "", role });
        } else {
          approvalPending = true;
            setAwaitingApproval(true);
          setSession(null);
        }
      }
      if (active) {
        setStatus("verified");
        setMessage(approvalPending ? "Your email is confirmed. Your account is waiting for administrator approval before you can sign in." : token ? "Your email is confirmed and your account is ready." : "Your email is confirmed. Sign in to continue to WS Hub.");
      }
    };
    confirm().catch((reason) => { if (active) { setStatus("error"); setMessage(reason instanceof Error ? reason.message : "This confirmation link may have expired."); } });
    return () => { active = false; };
  }, []);
    return <div className="page-in mx-auto max-w-xl px-4 py-16 sm:py-24"><section className="card p-7 text-center sm:p-10"><span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${status === "error" ? "bg-red-50 text-red-600" : status === "checking" ? "bg-navy-50 text-navy-700" : "bg-emerald-50 text-emerald-700"}`}>{status === "checking" ? <LoaderCircle className="h-6 w-6 animate-spin" /> : status === "error" ? <MailCheck className="h-6 w-6" /> : <CheckCircle2 className="h-7 w-7" />}</span><p className="mt-5 text-[11px] font-bold uppercase tracking-[.14em] text-gold-800">Account confirmation</p><h1 className="mt-2 text-[28px] font-black text-navy-900">{status === "error" ? "Couldn’t confirm your email" : status === "checking" ? "One moment" : "You’re all set"}</h1><p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-slate-600">{message}</p><div className="mt-6 flex flex-wrap justify-center gap-2">{status === "error" && <Link to="/auth/verified" className="btn-navy px-4 py-2.5">Try again</Link>}<Link to={status === "verified" && !awaitingApproval ? "/dashboard" : status === "verified" ? "/" : "/login"} className="btn-gold px-5 py-2.5">{status === "verified" && !awaitingApproval ? "Go to dashboard" : status === "verified" ? "Back to WS Hub" : "Sign in to WS Hub"}<ArrowRight className="h-4 w-4" /></Link><Link to="/" className="rounded-md border border-slate-300 px-4 py-2.5 text-[12px] font-semibold text-navy-800 hover:bg-navy-50">Back to home</Link></div></section></div>;
}

export function AuthResetPasswordPage() {
  const params = callbackParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const accessToken = params.get("access_token") || "";
  useEffect(() => { document.title = "Reset password — WS Hub"; }, []);
  const requestReset = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await authApi.forgotPassword(email.trim()); setSent(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send the reset email. Try again shortly."); }
    finally { setSubmitting(false); }
  };
  const savePassword = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await authApi.resetPassword(password, accessToken); setComplete(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update your password. The link may have expired."); }
    finally { setSubmitting(false); }
  };
  return <div className="page-in mx-auto max-w-xl px-4 py-12 sm:py-20"><Link to="/" className="mb-5 inline-flex items-center gap-2 text-[12px] font-semibold text-navy-700"><ArrowLeft className="h-4 w-4" /> WS Hub home</Link><section className="card p-6 sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><MailCheck className="h-5 w-5" /></span><p className="mt-5 text-[11px] font-bold uppercase tracking-[.14em] text-gold-800">Account security</p><h1 className="mt-2 text-[27px] font-black text-navy-900">{complete ? "Password updated" : accessToken ? "Choose a new password" : "Reset your password"}</h1><p className="mt-2 text-[13px] leading-relaxed text-slate-600">{complete ? "Your password has been changed. Sign in with the new password to continue." : accessToken ? "Choose a strong password with at least 8 characters." : sent ? "If there’s an account for this email, a reset link is on its way. Check your inbox." : "Enter the email address on your account and we’ll send you a reset link."}</p>
    {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-[12px] text-red-700">{error}</div>}
    {!complete && (accessToken ? <form onSubmit={savePassword} className="mt-6 space-y-4"><Field label="New password" htmlFor="reset-password" hint="Use 8–72 characters."><input id="reset-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputCls} value={password} onChange={(event) => setPassword(event.target.value)} /></Field><button type="submit" disabled={submitting} className="btn-gold w-full py-3">{submitting ? "Updating…" : "Update password"}</button></form> : !sent && <form onSubmit={requestReset} className="mt-6 space-y-4"><Field label="Email address" htmlFor="reset-email"><input id="reset-email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></Field><button type="submit" disabled={submitting} className="btn-gold w-full py-3">{submitting ? "Sending…" : "Send reset link"}</button></form>)}
    <div className="mt-6 border-t border-line pt-4 text-center text-[12px] text-slate-500"><Link to="/login" className="font-semibold text-navy-700 hover:underline">Return to sign in</Link></div></section></div>;
}
