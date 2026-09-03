"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserPolicies, getUserClaims } from "@/api/users";
import { ApiError } from "@/api/client";
import type { Policy, Claim } from "@/types/models";

type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function CoverageBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-brand-soft text-brand" : "bg-border/50 text-muted line-through"
      }`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full bg-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground">{status.replace(/_/g, " ")}</span>;
}

const DEMO_PHONE = "+919999900001";
const DEMO_PASSWORD = "demo1234";

export default function HomePage() {
  const { user, ready, login } = useAuth();
  const [policies, setPolicies] = useState<Load<Policy[]>>({ status: "loading" });
  const [claims, setClaims] = useState<Load<Claim[]>>({ status: "loading" });
  const [demoError, setDemoError] = useState<string | null>(null);
  const policyRef = useRef<HTMLDivElement>(null);

  function launchDemo() {
    setDemoError(null);
    login(DEMO_PHONE, DEMO_PASSWORD).catch((err) =>
      setDemoError(err instanceof ApiError ? err.message : "Could not start demo. Run the seed script first.")
    );
  }

  useEffect(() => {
    if (!user) return;
    setPolicies({ status: "loading" });
    getUserPolicies(user.id)
      .then((data) => setPolicies({ status: "ready", data }))
      .catch((err) => setPolicies({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load policies." }));

    setClaims({ status: "loading" });
    getUserClaims(user.id)
      .then((data) => setClaims({ status: "ready", data }))
      .catch((err) => setClaims({ status: "error", message: err instanceof ApiError ? err.message : "Failed to load activity." }));
  }, [user]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] p-4 md:p-8 font-sans text-[#1C1A2F]">
        <div className="max-w-[1400px] mx-auto bg-white rounded-[3rem] p-4 md:p-6 shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Hero Section Container */}
          <div className="bg-[#EEF1FA] rounded-[2.5rem] p-6 md:p-12 mb-16 relative overflow-hidden flex flex-col items-center">
            
            {/* Navbar */}
            <nav className="w-full flex justify-between items-center mb-16 relative z-10">
              <div className="flex items-center gap-3 font-semibold text-xl tracking-tight">
                <img src="/logo.png" alt="Surakhchain Logo" className="w-10 h-10 object-contain" />
                Surakhchain
              </div>
              <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#1C1A2F]/80">
                <a href="#" className="hover:text-[#1C1A2F] transition-colors">Protection</a>
                <a href="#" className="hover:text-[#1C1A2F] transition-colors">Claims</a>
                <a href="#" className="hover:text-[#1C1A2F] transition-colors">Disaster</a>
                <a href="#" className="hover:text-[#1C1A2F] transition-colors">For Insurers</a>
              </div>
              <button
                onClick={launchDemo}
                className="bg-[#1C1A2F] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black transition-colors"
              >
                Launch Demo
              </button>
            </nav>
            {demoError && (
              <p className="w-full text-center text-sm text-red-600 -mt-12 mb-12 relative z-10">{demoError}</p>
            )}

            {/* Hero Text */}
            <div className="text-center relative z-10 flex flex-col items-center mt-8 pb-8">
              <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-[#1C1A2F] mb-6 max-w-4xl leading-[1.1]">
                When Disaster Strikes,<br/>Protection Shouldn’t Wait.
              </h1>
              <p className="text-[#1C1A2F]/70 mb-10 max-w-2xl text-lg leading-relaxed font-light">
                Verified events. Automated claims. Faster payouts. Built for communities beyond the reach of traditional insurance.
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-24 w-full">
                <button className="bg-[#1C1A2F] text-white px-8 py-3.5 rounded-full text-sm font-medium hover:bg-black transition-colors">
                  Get Protected
                </button>
                <a href="#" className="text-[#1C1A2F] text-sm font-semibold hover:opacity-70 transition-opacity flex items-center gap-2">
                  See how it works &rarr;
                </a>
              </div>
              
              {/* Minimal Product Flow */}
              <div className="flex flex-col items-center gap-4 text-[#1C1A2F]/60 mt-4">
                <p className="text-xs font-bold tracking-[0.2em] text-[#1C1A2F]/80">
                  INCIDENT &rarr; VERIFY &rarr; AUTHORIZE &rarr; PAY
                </p>
                <p className="text-xs font-medium tracking-widest uppercase">
                  IVR &middot; SMS &middot; USSD &middot; WhatsApp &middot; PWA
                </p>
              </div>
            </div>
          </div>

          {/* What is SurakshChain Section */}
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 mb-16">
            <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
              <div className="md:w-1/3">
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-[#1C1A2F] mb-6">
                  What is SurakshChain?
                </h2>
                <button className="bg-[#2D2A43] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#1C1A2F] transition-colors">
                  See how it works &rarr;
                </button>
              </div>
              <div className="md:w-1/2 pt-2">
                <p className="text-xl text-[#1C1A2F]/80 leading-relaxed font-light">
                  SurakshChain is insurance infrastructure that turns verified real-world events into fast, transparent payouts — built for communities underserved by traditional insurance.
                </p>
              </div>
            </div>

            {/* Feature Cards Grid (4 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Card 1 */}
              <div className="col-span-1 md:col-span-2 bg-[#D1D5EF] rounded-[2rem] p-8 md:p-10 flex flex-col justify-between min-h-[320px] relative overflow-hidden">
                <h3 className="text-2xl font-medium text-[#1C1A2F] z-10">Verified when it matters</h3>
                <p className="text-[#1C1A2F]/70 max-w-sm mt-auto z-10 text-sm font-medium leading-relaxed">
                  Claims are cross-verified through trusted sources, using a 2-of-3 verification model before payouts are authorized.
                </p>
                {/* Decorative purple flower / coin placeholder */}
                <div className="absolute right-0 bottom-0 w-48 h-48 flex items-end justify-end">
                   <div className="absolute right-8 bottom-8 w-24 h-24 rounded-full bg-[#7C5CC2] shadow-xl border-4 border-[#A592D9] transform rotate-12"></div>
                   <div className="absolute right-20 bottom-24 w-12 h-12 bg-purple-400 rounded-t-full transform -rotate-45"></div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="col-span-1 bg-[#2C2943] rounded-[2rem] p-8 md:p-10 text-white flex flex-col justify-between min-h-[320px]">
                <h3 className="text-2xl font-medium leading-tight text-white/90">
                  Protection<br/>without barriers
                </h3>
                <p className="text-white/60 font-medium mt-auto text-sm leading-relaxed">
                  Access insurance through IVR, SMS and USSD — no smartphone or mobile internet required. Smartphone users can also use WhatsApp and the PWA.
                </p>
              </div>

              {/* Card 3 */}
              <div className="col-span-1 bg-[#2C2943] rounded-[2rem] p-8 md:p-10 text-white flex flex-col justify-between min-h-[320px]">
                <h3 className="text-2xl font-medium leading-tight text-white/90">
                  Payouts,<br/>not paperwork
                </h3>
                <p className="text-white/60 font-medium mt-auto text-sm leading-relaxed">
                  Once a qualifying claim is verified, SurakshChain automates authorization and settlement, creating a transparent audit trail from claim to payout.
                </p>
              </div>

            </div>
          </div>

          {/* Partners */}
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 mb-20">
             <div className="border-t border-b border-gray-100 py-8 flex flex-col md:flex-row items-center justify-between gap-8">
               <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider w-full md:w-48 leading-relaxed">
                 Backed by the best companies and visionary angels.
               </p>
               <div className="flex gap-6 md:gap-10 items-center justify-center flex-wrap opacity-40 grayscale text-xs font-bold tracking-wider">
                 <span>Fundamental Labs</span>
                 <span className="flex items-center gap-1 text-sm"><span className="text-lg">K</span> KUCOIN</span>
                 <span className="text-sm">III NGC</span>
                 <span>NxGen</span>
                 <span className="flex items-center gap-1"><span className="text-lg">M</span> Matter Labs</span>
                 <span className="flex items-center gap-1 text-sm"><span className="text-lg">D</span> DEXTOOLS</span>
                 <span>NGRAVE</span>
               </div>
             </div>
          </div>

          {/* Use Cases */}
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 mb-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div className="pt-4">
              <p className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wider">
                USD bloom in Action
              </p>
              <h2 className="text-5xl md:text-6xl font-medium tracking-tight text-[#1C1A2F] mb-6">
                Use cases
              </h2>
              <p className="text-[#1C1A2F]/70 max-w-sm leading-relaxed text-sm font-medium">
                USD bloom offers a variety of use cases for developers, businesses and treasuries seeking secure and profitable stablecoin integrations.
              </p>
            </div>

            <div className="bg-white rounded-[2rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex flex-col min-h-[400px]">
              <h3 className="text-2xl font-medium text-[#1C1A2F] mb-4">
                Business
              </h3>
              <p className="text-[#1C1A2F]/70 mb-8 leading-relaxed text-sm font-medium max-w-sm">
                Boost user engagement by offering USD bloom, a secure fiat-backed stablecoin with high yields, allowing your customers to earn effortlessly on your platform.
              </p>
              <a href="#" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1C1A2F] hover:opacity-70 transition-opacity">
                → Learn more
              </a>
              
              {/* CSS 3D Bank Element */}
              <div className="mt-12 flex justify-center items-end h-40">
                 <div className="w-4/5 h-24 bg-[#E3E6F7] rounded-t-lg relative flex flex-col items-center justify-end px-4 border-t-2 border-[#D1D5EF]">
                    {/* Roof */}
                    <div className="absolute -top-10 w-[110%] h-10 bg-[#CBD2EE] rounded-t-lg flex items-center justify-center">
                       <div className="w-1/2 h-4 bg-[#B8C2E8] rounded-full opacity-50"></div>
                    </div>
                    {/* Pillars */}
                    <div className="flex justify-between w-full h-20 mt-2 px-2">
                      <div className="w-4 h-full bg-[#B8C2E8] rounded-t-sm"></div>
                      <div className="w-4 h-full bg-[#B8C2E8] rounded-t-sm"></div>
                      <div className="w-4 h-full bg-[#B8C2E8] rounded-t-sm"></div>
                      <div className="w-4 h-full bg-[#B8C2E8] rounded-t-sm"></div>
                    </div>
                    {/* Base */}
                    <div className="absolute -bottom-4 w-[120%] h-4 bg-[#CBD2EE] rounded-b-md"></div>
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  const activePolicy = policies.status === "ready" ? policies.data.find((p) => p.status === "ACTIVE") ?? policies.data[0] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-8 sm:max-w-2xl">
      <p className="text-sm text-muted">Welcome back</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{user.name}</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/claims?new=accident"
          className="rounded-2xl bg-brand px-4 py-4 text-center text-sm font-semibold text-white"
        >
          Report Accident
        </Link>
        <Link
          href="/claims?new=death"
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-center text-sm font-semibold"
        >
          Report Death
        </Link>
        <button
          onClick={() => policyRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="col-span-2 rounded-2xl border border-border bg-surface px-4 py-4 text-center text-sm font-semibold sm:col-span-1"
        >
          View Protection
        </button>
      </div>

      <section ref={policyRef} className="mb-8 rounded-2xl border border-border bg-surface p-6 scroll-mt-6">
        <h2 className="mb-4 text-lg font-semibold">Your protection</h2>
        {policies.status === "loading" && <p className="text-sm text-muted">Loading policy…</p>}
        {policies.status === "error" && <p className="text-sm text-red-600">{policies.message}</p>}
        {policies.status === "ready" && !activePolicy && (
          <p className="text-sm text-muted">You don&apos;t have an active policy yet.</p>
        )}
        {policies.status === "ready" && activePolicy && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Policy number</p>
                <p className="font-mono text-sm font-medium">{activePolicy.policyNumber}</p>
              </div>
              <StatusPill status={activePolicy.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">Coverage</p>
                <p className="text-xl font-semibold">{formatINR(activePolicy.coverageAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Premium</p>
                <p className="text-xl font-semibold">{formatINR(activePolicy.premium)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CoverageBadge label="Accident" active={activePolicy.accidentCoverage} />
              <CoverageBadge label="Death" active={activePolicy.deathCoverage} />
              <CoverageBadge label="Disaster" active={activePolicy.disasterCoverage} />
            </div>
            <p className="text-xs text-muted">
              {formatDate(activePolicy.startDate)} – {formatDate(activePolicy.endDate)}
            </p>
            {activePolicy.nominee && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted">Nominee</p>
                <p className="text-sm font-medium">
                  {activePolicy.nominee.name} · {activePolicy.nominee.relationship}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
        {claims.status === "loading" && <p className="text-sm text-muted">Loading activity…</p>}
        {claims.status === "error" && <p className="text-sm text-red-600">{claims.message}</p>}
        {claims.status === "ready" && claims.data.length === 0 && (
          <p className="text-sm text-muted">No claims yet.</p>
        )}
        {claims.status === "ready" && claims.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {claims.data.slice(0, 5).map((claim) => (
              <li key={claim.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {claim.claimNumber} · {claim.type}
                  </p>
                  <p className="text-xs text-muted">{formatDate(claim.createdAt)}</p>
                </div>
                <StatusPill status={claim.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-brand-soft p-6 text-sm">
        <p className="mb-2 font-semibold text-brand">Insurance without needing a smartphone</p>
        <p className="mb-4 text-muted">IVR · SMS · USSD</p>
        <p className="mb-2 font-semibold text-brand">Need internet</p>
        <p className="text-muted">WhatsApp · PWA</p>
      </section>
    </div>
  );
}
