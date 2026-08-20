'use client';

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, ArrowRight, Menu, X, LockKeyhole, Camera, ShieldCheck, Radio, KeyRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "locks",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactMutation = trpc.system.notifyOwner.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await contactMutation.mutateAsync({
        title: `New Sales Inquiry: ${formData.name}`,
        content: `
Service Interest: ${formData.service}
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

Message:
${formData.message}

---
Please follow up with this lead as soon as possible.
        `,
      });

      alert("Success! Your inquiry has been sent. Our sales team will contact you shortly.");

      setFormData({
        name: "",
        email: "",
        phone: "",
        service: "locks",
        message: "",
      });
    } catch (error) {
      alert("Error: Failed to send inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSelect = (service: string) => {
    setFormData((previous) => ({ ...previous, service }));
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLocationMapReady = useCallback((map: google.maps.Map) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { address: "313 Cape Road, Newton Park, Gqeberha, 6070, South Africa" },
      (results, status) => {
        const location = results?.[0]?.geometry.location;
        if (status !== "OK" || !location) return;

        map.setCenter(location);
        new window.google.maps.marker.AdvancedMarkerElement({
          map,
          position: location,
          title: "Houdini Locksmith & Security",
        });
      },
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-lime-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663346956907/FvsJQLgDSLrAGayZ.png" 
              alt="Houdini Logo" 
              className="h-12 sm:h-14 w-auto max-w-[180px] object-contain" loading="eager"
            />
          </div>
          <div className="hidden md:flex items-center gap-5">
            <button type="button" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="text-sm font-medium text-gray-300 transition hover:text-lime-400">
              About Us
            </button>
            <button type="button" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })} className="text-sm font-medium text-gray-300 transition hover:text-lime-400">
              Services
            </button>
            <a href="/login" className="text-gray-300 hover:text-lime-400 font-medium transition">
              Login
            </a>
            <Button 
              className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg shadow-lime-500/50"
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            >
              Get Started
            </Button>
          </div>
          <button 
            className="md:hidden text-lime-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-lime-500/20 p-4 space-y-4">
            <button type="button" onClick={() => { setMobileMenuOpen(false); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }} className="block text-left text-gray-300 hover:text-lime-400 font-medium">
              About Us
            </button>
            <button type="button" onClick={() => { setMobileMenuOpen(false); document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }); }} className="block text-left text-gray-300 hover:text-lime-400 font-medium">
              Services
            </button>
            <a href="/login" className="block text-gray-300 hover:text-lime-400 font-medium">
              Login
            </a>
            <Button 
              className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Get Started
            </Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_44%,rgba(132,204,22,0.16),transparent_25%),radial-gradient(circle_at_25%_82%,rgba(16,185,129,0.08),transparent_30%)]" />
          <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1440 760" fill="none" preserveAspectRatio="xMidYMid slice">
            <path className="hero-circuit-flow" d="M760 100H1140L1280 240H1440M700 280H980L1090 390H1370M790 530H1050L1190 670H1440" stroke="rgba(163,230,53,0.22)" strokeWidth="1" />
            <path d="M0 560H250L380 430H620M190 760L390 560H700" stroke="rgba(74,222,128,0.13)" strokeWidth="1" />
            <circle className="hero-security-node" cx="1140" cy="100" r="5" fill="rgba(190,242,100,0.78)" />
            <circle className="hero-security-node" style={{ animationDelay: "-1.2s" }} cx="1090" cy="390" r="4" fill="rgba(190,242,100,0.62)" />
            <circle className="hero-security-node" style={{ animationDelay: "-2.4s" }} cx="1050" cy="530" r="4" fill="rgba(190,242,100,0.55)" />
            <circle className="hero-security-node" style={{ animationDelay: "-3.6s" }} cx="380" cy="430" r="4" fill="rgba(52,211,153,0.48)" />
          </svg>
          <ShieldCheck className="absolute right-[11%] top-[14%] h-24 w-24 text-lime-300/[0.07] sm:h-32 sm:w-32" />
          <LockKeyhole className="absolute bottom-[11%] right-[40%] h-16 w-16 text-lime-300/[0.06] sm:h-20 sm:w-20" />
          <Camera className="absolute right-[4%] top-[54%] h-16 w-16 text-emerald-300/[0.06] sm:h-20 sm:w-20" />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Left side - Text content */}
            <div className="relative z-10">
              <div className="mb-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-300 backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5" /> Local security specialists
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                  We Lock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">World</span>
                </h1>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Enterprise-grade security solutions for homes and businesses. 24/7 emergency response. Professional locksmithing and advanced security systems.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg shadow-lime-500/50 text-base"
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Request a Quote <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="text-lime-400 border-lime-500/50 hover:bg-lime-500/10 text-base"
                  onClick={() => { window.location.href = "tel:0413657565"; }}
                >
                  <Phone className="mr-2 w-5 h-5" />
                  041 365 7565
                </Button>
              </div>

              <a href="tel:0413657565" className="hero-support-badge group inline-flex max-w-full items-center gap-3 rounded-2xl border border-lime-300/50 bg-slate-950/75 px-4 py-3 shadow-xl shadow-lime-500/15 backdrop-blur-md transition hover:border-lime-200 hover:bg-lime-300/10 sm:px-5" aria-label="Call Houdini for 24/7 support">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-slate-950 shadow-lg shadow-lime-400/30">
                  <span className="hero-support-ping absolute inset-0 rounded-xl bg-lime-300" aria-hidden="true" />
                  <Radio className="relative h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold uppercase tracking-[0.16em] text-lime-300">24/7 Support</span>
                  <span className="mt-0.5 block text-sm text-slate-300">Emergency security assistance, whenever you need it.</span>
                </span>
                <ArrowRight className="ml-1 h-5 w-5 shrink-0 text-lime-300 transition group-hover:translate-x-1" />
              </a>
            </div>

            {/* Right side - Lockbro mascot */}
            <div className="relative z-10 min-h-[26rem] sm:min-h-[32rem] md:min-h-[38rem] lg:min-h-[42rem] flex items-center justify-center px-2 sm:px-4">
              <div className="relative w-full h-full min-h-[26rem] sm:min-h-[32rem] md:min-h-[38rem] lg:min-h-[42rem] flex items-center justify-center">
                <div className="hero-mascot-aura absolute h-56 w-56 rounded-full bg-lime-400/20 blur-3xl sm:h-72 sm:w-72" aria-hidden="true" />
                <div className="hero-mascot-float relative flex h-full w-full items-center justify-center">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663346956907/ANBkoVbwdDKvIghm.png"
                  alt="Lockbro, the Houdini security mascot"
                  loading="eager"
                  fetchPriority="high"
                  className="h-full max-h-[560px] sm:max-h-[620px] lg:max-h-[680px] w-auto max-w-full object-contain drop-shadow-2xl hover:scale-[1.02] hover:drop-shadow-3xl transition-all duration-300"
                />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Houdini */}
      <section id="about" className="relative isolate overflow-hidden border-t border-lime-500/20 bg-slate-950/55 py-24 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[linear-gradient(135deg,transparent_0%,rgba(132,204,22,0.04)_50%,transparent_100%)]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-4 rounded-[2rem] border border-lime-300/15 bg-lime-400/[0.03]" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-7 shadow-2xl shadow-black/30 sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(163,230,53,0.2),transparent_26%)]" aria-hidden="true" />
              <div className="relative">
                <div className="mb-12 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-300/25 bg-lime-300/10 text-lime-300 shadow-lg shadow-lime-500/10">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <span className="rounded-full border border-lime-300/20 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Established 1975</span>
                </div>
                <p className="max-w-sm text-3xl font-bold leading-tight text-white sm:text-4xl">Securing tomorrow, today.</p>
                <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Smart security solutions and expert locksmith services, thoughtfully combined to help secure the places that matter most.</p>
                <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    ["50+", "Years of experience"],
                    ["2,300+", "Projects completed"],
                    ["1,560+", "Satisfied customers"],
                    ["120", "Professionals"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center transition duration-300 hover:border-lime-300/30 hover:bg-lime-300/[0.05]">
                      <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-300/90 sm:text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">About Houdini</p>
            <h2 className="max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">Your Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400">Superheroes</span></h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Houdini Locksmiths and Security has been established in the security industry since 1975, delivering domestic and industrial security solutions with a response-first approach.</p>
            <p className="mt-4 max-w-2xl leading-7 text-slate-400">Our work is grounded in quality workmanship and fair labour practices. We welcome accountability through regular inspections as members of the Locksmiths Association of South Africa and the Security Industries Regulatory Authority.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-lime-300/30 hover:bg-lime-300/[0.04]">
                <ShieldCheck className="h-6 w-6 text-lime-300" />
                <h3 className="mt-4 font-semibold text-white">Quality you can trust</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Proven workmanship and practices built around protecting people, property, and peace of mind.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-lime-300/30 hover:bg-lime-300/[0.04]">
                <Radio className="h-6 w-6 text-lime-300" />
                <h3 className="mt-4 font-semibold text-white">Accountable security</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">From locks to smart security systems, every recommendation is shaped around the right solution for your site.</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="mt-8 border-lime-300/40 text-lime-300 hover:bg-lime-300/10" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>
              Explore our solutions <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Premium Services Section */}
      <section id="services" className="relative border-t border-lime-500/20 bg-slate-950/70 py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/70 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">Houdini expertise</p>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Complete Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400">Solutions</span>
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">From everyday access to advanced perimeter protection, every service is delivered with care, precision, and a response-first mindset.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Locks", service: "locks", image: "https://houdini.co.za/wp-content/uploads/2024/01/locks-1.png", description: "Reliable lock solutions for homes, businesses, and urgent call-outs.", points: ["Residential and commercial locks", "Emergency call-out support"] },
              { title: "CCTV", service: "cctv", image: "https://houdini.co.za/wp-content/uploads/2024/01/cctv-3.png", description: "Tailored surveillance systems from standalone cameras to integrated monitoring.", points: ["System design and installation", "On-site or remote monitoring"] },
              { title: "Safes", service: "safes", image: "https://houdini.co.za/wp-content/uploads/2024/01/safe.png", description: "Protection for valuables with solutions matched to your security requirements.", points: ["Wall and floor safes", "SABS and insurance-approved options"] },
              { title: "Intercoms", service: "intercoms", image: "https://houdini.co.za/wp-content/uploads/2024/01/safe-1.png", description: "Connected entry communication for homes, offices, and controlled-access sites.", points: ["Application-specific systems", "Clearer visitor management"] },
              { title: "Electric Fencing", service: "electric-fencing", image: "https://houdini.co.za/wp-content/uploads/2024/01/fence.png", description: "A strong perimeter layer designed to deter intrusion before it reaches your property.", points: ["Perimeter security planning", "Electric fencing and detection"] },
              { title: "Keys", service: "keys", image: "https://houdini.co.za/wp-content/uploads/2024/01/fence-2.png", description: "Key cutting and access solutions from everyday keys to restricted systems.", points: ["Cylinder and vehicle keys", "Master-keyed and restricted keyways"] },
            ].map((item) => (
              <button
                key={item.service}
                type="button"
                onClick={() => handleServiceSelect(item.service)}
                className="group relative min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left shadow-2xl shadow-black/20 transition duration-500 hover:-translate-y-1 hover:border-lime-400/70 hover:shadow-lime-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${item.image})` }} aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30 transition duration-500 group-hover:via-slate-950/70" aria-hidden="true" />
                <div className="absolute inset-0 bg-lime-400/0 transition duration-500 group-hover:bg-lime-400/5" aria-hidden="true" />
                <div className="relative flex min-h-[360px] flex-col justify-end p-6 sm:p-7">
                  <div className="mb-auto flex items-start justify-between">
                    <span className="rounded-full border border-lime-300/30 bg-slate-950/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-300 backdrop-blur-sm">{item.service.replace("-", " ")}</span>
                    <ArrowRight className="h-5 w-5 text-lime-300 opacity-70 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white sm:text-3xl">{item.title}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-200">{item.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.points.map((point) => <span key={point} className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs text-slate-200 backdrop-blur-sm">{point}</span>)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative overflow-hidden border-t border-lime-500/20 bg-slate-950/45 py-24 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(132,204,22,0.11),transparent_32%)]" aria-hidden="true" />
        <div className="relative max-w-3xl mx-auto">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">Request a consultation</p>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Let’s secure your <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400">world.</span>
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">Share a few details and our sales team will respond within one hour with the right next step.</p>
          </div>

          <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-lime-300/20 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-slate-950/85 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><ShieldCheck className="h-5 w-5" /></span>
                <div><p className="text-sm font-semibold text-white">Tell us what you need</p><p className="text-xs text-slate-400">Fields marked <span className="text-lime-300">*</span> are required.</p></div>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-lime-300"><span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]" /> Typical response: within 1 hour</span>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="consultation-name" className="text-sm font-medium text-slate-200">Full name <span className="text-lime-300">*</span></label>
                  <Input id="consultation-name" autoComplete="name" placeholder="e.g. Jamie Woodhead" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 border-lime-500/25 bg-slate-950/55 text-white placeholder:text-slate-500 focus-visible:border-lime-300 focus-visible:ring-lime-300/30" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="consultation-email" className="text-sm font-medium text-slate-200">Email address <span className="text-lime-300">*</span></label>
                  <Input id="consultation-email" type="email" autoComplete="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-12 border-lime-500/25 bg-slate-950/55 text-white placeholder:text-slate-500 focus-visible:border-lime-300 focus-visible:ring-lime-300/30" required />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="consultation-phone" className="text-sm font-medium text-slate-200">Phone number <span className="text-lime-300">*</span></label>
                <Input id="consultation-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. 041 365 7565" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-12 border-lime-500/25 bg-slate-950/55 text-white placeholder:text-slate-500 focus-visible:border-lime-300 focus-visible:ring-lime-300/30" required />
                <p className="text-xs text-slate-500">We’ll use this only to follow up on your consultation request.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="consultation-service" className="text-sm font-medium text-slate-200">What can we help secure? <span className="text-lime-300">*</span></label>
                <select id="consultation-service" value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className="h-12 w-full rounded-md border border-lime-500/25 bg-slate-950/55 px-4 text-white transition focus:border-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/30">
                  <option value="locks">Locks</option>
                  <option value="cctv">CCTV</option>
                  <option value="safes">Safes</option>
                  <option value="intercoms">Intercoms</option>
                  <option value="electric-fencing">Electric Fencing</option>
                  <option value="keys">Keys</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="consultation-message" className="text-sm font-medium text-slate-200">How can we help? <span className="text-lime-300">*</span></label>
                <Textarea id="consultation-message" placeholder="Tell us about your property, the concern you have, and the solution you’re looking for..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="min-h-36 border-lime-500/25 bg-slate-950/55 text-white placeholder:text-slate-500 focus-visible:border-lime-300 focus-visible:ring-lime-300/30" required />
              </div>

              <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex max-w-sm items-center gap-2 text-xs leading-5 text-slate-400"><ShieldCheck className="h-4 w-4 shrink-0 text-lime-300" />Your enquiry is sent directly to the Houdini team for a personal response.</p>
                <Button type="submit" disabled={isSubmitting} className="h-12 w-full bg-lime-500 px-6 text-black shadow-lg shadow-lime-500/30 transition hover:bg-lime-400 hover:shadow-lime-500/50 disabled:opacity-50 sm:w-auto">
                  {isSubmitting ? "Sending request..." : <>Request my consultation <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative isolate overflow-hidden border-t border-lime-500/20 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-lime-400/[0.07] blur-3xl" />
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-lime-300/70 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 border-b border-white/10 pb-12 xl:grid-cols-[0.85fr_1.15fr] xl:gap-16">
            <div>
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663346956907/FvsJQLgDSLrAGayZ.png" alt="Houdini Locksmith" className="h-14 w-auto max-w-[190px] object-contain" loading="lazy" />
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">Security and locksmith solutions with the expertise to protect homes, businesses, and the moments that matter.</p>

              <div className="mt-8 space-y-4">
                <a href="tel:0413657565" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-lime-300/35 hover:bg-lime-300/[0.05]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><Phone className="h-5 w-5" /></span>
                  <span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Call our team</span><span className="mt-1 block font-semibold text-white group-hover:text-lime-300">041 365 7565</span></span>
                </a>
                <a href="mailto:sales@houdini.co.za" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-lime-300/35 hover:bg-lime-300/[0.05]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300"><Mail className="h-5 w-5" /></span>
                  <span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email sales</span><span className="mt-1 block font-semibold text-white group-hover:text-lime-300">sales@houdini.co.za</span></span>
                </a>
              </div>

              <div className="mt-10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-300">Security solutions</p>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:max-w-md">
                  {[
                    ["Locks", "locks"], ["CCTV", "cctv"], ["Safes", "safes"], ["Intercoms", "intercoms"], ["Electric Fencing", "electric-fencing"], ["Keys", "keys"],
                  ].map(([label, service]) => (
                    <button key={service} type="button" onClick={() => handleServiceSelect(service)} className="group flex items-center justify-between border-b border-white/10 pb-2 text-left text-sm text-slate-400 transition hover:border-lime-300/50 hover:text-lime-300">
                      {label}<ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-lime-300/20 bg-slate-900/70 shadow-2xl shadow-black/30">
              <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-900/80 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-300">Visit Houdini</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Newton Park, Gqeberha</h2>
                </div>
                <a href="https://www.google.com/maps/search/?api=1&query=313%20Cape%20Road%2C%20Newton%20Park%2C%20Gqeberha%2C%206070" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-lime-300 transition hover:text-lime-200">
                  <MapPin className="h-4 w-4" /> Open directions <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <MapView initialCenter={{ lat: -33.957, lng: 25.585 }} initialZoom={15} onMapReady={handleLocationMapReady} className="h-[340px] sm:h-[400px]" />
              <div className="flex items-start gap-3 bg-slate-950/90 p-5 text-sm text-slate-300">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />
                <span><strong className="font-semibold text-white">313 Cape Road</strong><br />Newton Park, Gqeberha, 6070</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; 2026 Houdini Locksmith &amp; Security. All rights reserved.</p>
            <div className="flex items-center gap-4"><span className="inline-flex items-center gap-2 text-lime-300"><span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.85)]" /> 24/7 Emergency Support</span><button type="button" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-lime-300">About Houdini</button></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
