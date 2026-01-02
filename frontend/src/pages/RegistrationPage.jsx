import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function RegistrationPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [me, setMe] = useState(null);
  const [reg, setReg] = useState(null);

  const [legalFirst, setLegalFirst] = useState("");
  const [legalMiddle, setLegalMiddle] = useState("");
  const [legalLast, setLegalLast] = useState("");

  const [phone, setPhone] = useState("");

  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("NY");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("US");

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [error, setError] = useState("");

  const termsVersion = useMemo(() => reg?.agreements?.terms?.version || "2026-01-01", [reg]);
  const privacyVersion = useMemo(() => reg?.agreements?.privacy?.version || "2026-01-01", [reg]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [meRes, regRes] = await Promise.all([
          axios.get(`${API}/auth/me`, { withCredentials: true }),
          axios.get(`${API}/registration`, { withCredentials: true }),
        ]);

        if (!mounted) return;

        setMe(meRes.data);
        setReg(regRes.data);

        // Prefill legal name: use registration -> fallback to /auth/me name split
        const rn = regRes.data?.legal_name;
        if (rn?.first || rn?.last) {
          setLegalFirst(rn.first || "");
          setLegalMiddle(rn.middle || "");
          setLegalLast(rn.last || "");
        } else {
          const fallbackName = (meRes.data?.name || "").trim();
          const parts = fallbackName.split(/\s+/).filter(Boolean);
          setLegalFirst(parts[0] || "");
          setLegalLast(parts.length > 1 ? parts[parts.length - 1] : "");
          setLegalMiddle(parts.length > 2 ? parts.slice(1, -1).join(" ") : "");
        }

        setPhone(regRes.data?.phone || "");

        const addr = regRes.data?.address || {};
        setStreet1(addr.street1 || "");
        setStreet2(addr.street2 || "");
        setCity(addr.city || "");
        setState(addr.state || "NY");
        setPostal(addr.postal_code || "");
        setCountry(addr.country || "US");

        setAcceptTerms(!!regRes.data?.agreements?.terms?.accepted);
        setAcceptPrivacy(!!regRes.data?.agreements?.privacy?.accepted);

        // If already complete, send user into app
        if (meRes.data?.registration_complete) {
          window.location.assign("/vault");
          return;
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.detail || "Failed to load registration. Please try again.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function validate() {
    const errs = [];
    if (!legalFirst.trim()) errs.push("First name is required.");
    if (!legalLast.trim()) errs.push("Last name is required.");
    if (!phone.trim()) errs.push("Phone number is required.");
    if (!street1.trim()) errs.push("Street address is required.");
    if (!city.trim()) errs.push("City is required.");
    if (!state.trim()) errs.push("State is required.");
    if (!postal.trim()) errs.push("ZIP/postal code is required.");
    if (!acceptTerms) errs.push("You must accept the Terms of Service.");
    if (!acceptPrivacy) errs.push("You must accept the Privacy Policy.");
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const errs = validate();
    if (errs.length) {
      setError(errs[0]); // show first error (clean UX on mobile)
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API}/registration/complete`,
        {
          legal_name: { first: legalFirst.trim(), middle: legalMiddle.trim(), last: legalLast.trim() },
          phone: phone.trim(),
          address: {
            street1: street1.trim(),
            street2: street2.trim(),
            city: city.trim(),
            state: state.trim(),
            postal_code: postal.trim(),
            country: country.trim(),
          },
          agreements: {
            terms: { accepted: true, version: termsVersion },
            privacy: { accepted: true, version: privacyVersion },
          },
        },
        { withCredentials: true }
      );

      // Refresh auth state and route into app
      const meRes = await axios.get(`${API}/auth/me`, { withCredentials: true });
      if (meRes.data?.registration_complete) {
        window.location.assign("/vault");
      } else {
        setError("Registration did not complete. Please retry.");
      }
    } catch (e2) {
      setError(e2?.response?.data?.detail || "Failed to complete registration.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      // Ignore logout errors
    }
    window.location.assign("/");
  }

  return (
    <div className="min-h-screen bg-[#0B1221] text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-xl">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-wide" style={{ fontFamily: "Cinzel, serif" }}>
                  Complete Your Registration
                </h1>
                <p className="mt-2 text-sm text-white/70">
                  Before entering the Vault, confirm your details and accept the required agreements.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-[#C6A87C]/30 bg-[#C6A87C]/10 px-3 py-2 text-xs text-[#C6A87C]">
                Secure Setup
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-white/60">Signed in as</div>
              <div className="mt-1 text-sm font-medium">{me?.email || "—"}</div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="mt-8 space-y-3">
                <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
                <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-6">
                {/* Legal Name */}
                <section>
                  <h2 className="text-sm font-semibold text-[#C6A87C]">Legal Name</h2>
                  <p className="mt-1 text-xs text-white/60">Use your legal name for trust records and official documents.</p>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                      placeholder="First name"
                      value={legalFirst}
                      onChange={(e) => setLegalFirst(e.target.value)}
                      autoComplete="given-name"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                      placeholder="Middle (optional)"
                      value={legalMiddle}
                      onChange={(e) => setLegalMiddle(e.target.value)}
                      autoComplete="additional-name"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                      placeholder="Last name"
                      value={legalLast}
                      onChange={(e) => setLegalLast(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </section>

                {/* Phone */}
                <section>
                  <h2 className="text-sm font-semibold text-[#C6A87C]">Phone Number</h2>
                  <p className="mt-1 text-xs text-white/60">Used for account security and critical notifications.</p>
                  <input
                    className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                    placeholder="(555) 555-5555"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </section>

                {/* Address */}
                <section>
                  <h2 className="text-sm font-semibold text-[#C6A87C]">Address</h2>
                  <p className="mt-1 text-xs text-white/60">Used for legal and administrative trust records.</p>

                  <div className="mt-3 space-y-3">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                      placeholder="Street address"
                      value={street1}
                      onChange={(e) => setStreet1(e.target.value)}
                      autoComplete="address-line1"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                      placeholder="Apt / Suite (optional)"
                      value={street2}
                      onChange={(e) => setStreet2(e.target.value)}
                      autoComplete="address-line2"
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                      />
                      <select
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        autoComplete="address-level1"
                      >
                        {US_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60 placeholder:text-white/40"
                        placeholder="ZIP / Postal code"
                        value={postal}
                        onChange={(e) => setPostal(e.target.value)}
                        autoComplete="postal-code"
                        inputMode="numeric"
                      />
                      <select
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#C6A87C]/60"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        autoComplete="country"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="MX">Mexico</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Agreements */}
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h2 className="text-sm font-semibold text-[#C6A87C]">Agreements</h2>
                  <div className="mt-3 space-y-3 text-sm">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[#C6A87C]"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                      />
                      <span className="text-white/85">
                        I agree to the{" "}
                        <a className="text-[#C6A87C] underline" href="/terms" target="_blank" rel="noreferrer">
                          Terms of Service
                        </a>
                        .
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[#C6A87C]"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                      />
                      <span className="text-white/85">
                        I agree to the{" "}
                        <a className="text-[#C6A87C] underline" href="/privacy" target="_blank" rel="noreferrer">
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>

                    <div className="text-xs text-white/55">
                      Your acceptance is recorded for compliance.
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={classNames(
                      "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                      "bg-[#C6A87C] text-[#0B1221] shadow-lg shadow-[#C6A87C]/20",
                      "hover:bg-[#D4B88A] active:scale-[0.98]",
                      "disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                  >
                    {submitting ? "Entering the Vault..." : "Enter the Vault"}
                  </button>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full rounded-xl border border-[#C6A87C]/40 bg-transparent px-4 py-3 text-sm font-semibold text-[#C6A87C] transition-all hover:bg-[#C6A87C]/10"
                  >
                    Log Out
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">
          OmniGoVault • Vault-Gold Secure Registration
        </div>
      </div>
    </div>
  );
}
