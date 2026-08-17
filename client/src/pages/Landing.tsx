'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, ArrowRight, Menu, X, LockKeyhole, Camera, ShieldCheck, Radio, Zap, KeyRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
          <div className="hidden md:flex gap-4">
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

      {/* Hero Section with Technician Image */}
      <section className="relative py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Left side - Text content */}
            <div className="relative z-10">
              <div className="mb-8">
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

              {/* Trust indicators */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-lime-400">500+</div>
                  <p className="text-sm text-gray-400">Customers</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-lime-400">15 min</div>
                  <p className="text-sm text-gray-400">Response</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-lime-400">24/7</div>
                  <p className="text-sm text-gray-400">Support</p>
                </div>
              </div>
            </div>

            {/* Right side - Technician image */}
            <div className="relative min-h-[26rem] sm:min-h-[32rem] md:min-h-[38rem] lg:min-h-[42rem] flex items-center justify-center rounded-3xl bg-gradient-to-br from-lime-500/10 via-transparent to-slate-900/40 px-2 sm:px-4">
              <div className="relative w-full h-full min-h-[26rem] sm:min-h-[32rem] md:min-h-[38rem] lg:min-h-[42rem] flex items-center justify-center">
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
      </section>

      {/* Services Detail Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.3em] text-lime-400 mb-3">What we do</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Complete Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">Solutions</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Professional services tailored to protect your home, business, and vehicle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Locks */}
            <button onClick={() => handleServiceSelect("locks")} className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-200 group text-left w-full min-h-[25rem]">
              <div className="mb-6 flex justify-center relative h-28">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, rgba(132, 204, 22, 0.6) 0%, transparent 70%)" }}></div>
                <LockKeyhole className="w-24 h-24 text-lime-400 group-hover:scale-110 transition-transform drop-shadow-lg relative z-10" strokeWidth={1.4} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Locks</h3>
              <p className="text-gray-400 mb-6 text-center">A wide range of locks backed by mobile call-out vehicles for residential, commercial, and emergency lock problems.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Residential and commercial locks</li>
                <li>• Mobile call-out response</li>
                <li>• Lock repair and replacement</li>
              </ul>
            </button>

            {/* CCTV */}
            <button onClick={() => handleServiceSelect("cctv")} className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-200 group text-left w-full min-h-[25rem]">
              <div className="mb-6 flex justify-center relative h-28">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, rgba(132, 204, 22, 0.6) 0%, transparent 70%)" }}></div>
                <Camera className="w-24 h-24 text-lime-400 group-hover:scale-110 transition-transform drop-shadow-lg relative z-10" strokeWidth={1.4} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">CCTV</h3>
              <p className="text-gray-400 mb-6 text-center">Tailor-made CCTV systems from stand-alone installations to highly integrated solutions with on-site or off-site monitoring.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Stand-alone camera systems</li>
                <li>• Integrated surveillance</li>
                <li>• On-site or off-site monitoring</li>
              </ul>
            </button>

            {/* Safes */}
            <button onClick={() => handleServiceSelect("safes")} className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-200 group text-left w-full min-h-[25rem]">
              <div className="mb-6 flex justify-center relative h-28">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, rgba(132, 204, 22, 0.6) 0%, transparent 70%)" }}></div>
                <ShieldCheck className="w-24 h-24 text-lime-400 group-hover:scale-110 transition-transform drop-shadow-lg relative z-10" strokeWidth={1.4} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Safes</h3>
              <p className="text-gray-400 mb-6 text-center">Safe solutions for every requirement, from basic wall safes to SABS- and insurance-approved categorised safes.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Wall safes</li>
                <li>• SABS-approved options</li>
                <li>• Insurance-approved categories</li>
              </ul>
            </button>

            {/* Intercoms */}
            <button onClick={() => handleServiceSelect("intercoms")} className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-200 group text-left w-full min-h-[25rem]">
              <div className="mb-6 flex justify-center relative h-28">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, rgba(132, 204, 22, 0.6) 0%, transparent 70%)" }}></div>
                <Radio className="w-24 h-24 text-lime-400 group-hover:scale-110 transition-transform drop-shadow-lg relative z-10" strokeWidth={1.4} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Intercoms</h3>
              <p className="text-gray-400 mb-6 text-center">A wide range of intercom products selected to suit specific residential, commercial, and access-control applications.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Application-specific products</li>
                <li>• Entry communication systems</li>
                <li>• Residential and commercial use</li>
              </ul>
            </button>

            {/* Electric Fencing */}
            <button onClick={() => handleServiceSelect("electric-fencing")} className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-200 group text-left w-full min-h-[25rem]">
              <div className="mb-6 flex justify-center relative h-28">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, rgba(132, 204, 22, 0.6) 0%, transparent 70%)" }}></div>
                <Zap className="w-24 h-24 text-lime-400 group-hover:scale-110 transition-transform drop-shadow-lg relative z-10" strokeWidth={1.4} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Electric Fencing</h3>
              <p className="text-gray-400 mb-6 text-center">Perimeter-security solutions combining electric fencing and outdoor motion detection to help protect your property.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Electric perimeter security</li>
                <li>• Outdoor motion detection</li>
                <li>• Property protection planning</li>
              </ul>
            </button>

            {/* Keys */}
            <button onClick={() => handleServiceSelect("keys")} className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 hover:-translate-y-1 transition-all duration-200 group text-left w-full min-h-[25rem]">
              <div className="mb-6 flex justify-center relative h-28">
                <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: "radial-gradient(circle, rgba(132, 204, 22, 0.6) 0%, transparent 70%)" }}></div>
                <KeyRound className="w-24 h-24 text-lime-400 group-hover:scale-110 transition-transform drop-shadow-lg relative z-10" strokeWidth={1.4} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Keys</h3>
              <p className="text-gray-400 mb-6 text-center">Key cutting from basic cylinder keys and car keys through to integrated master-keyed and restricted-keyway systems.</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Cylinder keys</li>
                <li>• Car keys</li>
                <li>• Master-keyed systems</li>
                <li>• Restricted keyways</li>
              </ul>
            </button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-400">Our sales team will respond within 1 hour</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder:text-gray-500"
                required
              />
              <Input
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <Input
              type="tel"
              placeholder="Your Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder:text-gray-500"
              required
            />

            <select
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full bg-slate-900/50 border border-lime-500/30 focus:border-lime-500 text-white rounded-md px-4 py-2 placeholder:text-gray-500"
            >
              <option value="locks">Locks</option>
              <option value="cctv">CCTV</option>
              <option value="safes">Safes</option>
              <option value="intercoms">Intercoms</option>
              <option value="electric-fencing">Electric Fencing</option>
              <option value="keys">Keys</option>
            </select>

            <Textarea
              placeholder="Tell us about your security needs..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder:text-gray-500 min-h-32"
              required
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg shadow-lime-500/50 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Inquiry"}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-lime-500/20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <div className="space-y-2 text-gray-400">
                <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> 041 365 7565</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> sales@houdini.co.za</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> 313 Cape Road, Newton Park, 6070</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button type="button" onClick={() => handleServiceSelect("locks")} className="hover:text-lime-400 transition text-left">Locks</button></li>
                <li><button type="button" onClick={() => handleServiceSelect("cctv")} className="hover:text-lime-400 transition text-left">CCTV</button></li>
                <li><button type="button" onClick={() => handleServiceSelect("safes")} className="hover:text-lime-400 transition text-left">Safes</button></li>
                <li><button type="button" onClick={() => handleServiceSelect("intercoms")} className="hover:text-lime-400 transition text-left">Intercoms</button></li>
                <li><button type="button" onClick={() => handleServiceSelect("electric-fencing")} className="hover:text-lime-400 transition text-left">Electric Fencing</button></li>
                <li><button type="button" onClick={() => handleServiceSelect("keys")} className="hover:text-lime-400 transition text-left">Keys</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Hours</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Monday - Friday: 7am - 6pm</li>
                <li>Saturday: 8am - 4pm</li>
                <li>Sunday: Emergency Only</li>
                <li>24/7 Emergency Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-lime-500/20 pt-8 text-center text-gray-500">
            <p>&copy; 2026 Houdini Locksmith & Security. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
