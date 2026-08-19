'use client';

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, ArrowRight, Menu, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Landing() {
  const [, setLocation] = useLocation();
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
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-logo-transparent-RfoHRF3Husuc9uP4pPA7oX.webp" 
              alt="Houdini Logo" 
              className="h-12 w-auto"
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
                  size="lg"
                  variant="outline"
                  className="text-lime-400 border-lime-500/50 hover:bg-lime-500/10 text-base"
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
            <div className="relative h-80 sm:h-96 md:h-[500px] lg:h-[600px] flex items-center justify-center">
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-hero_b03acded.png"
                  alt="Houdini Mascot" 
                  className="h-full w-auto object-contain drop-shadow-2xl hover:drop-shadow-3xl transition-shadow duration-300"
                />
              </div>
            </div>
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
              {
                title: "Locks",
                service: "locks",
                image: "https://houdini.co.za/wp-content/uploads/2024/01/locks-1.png",
                description: "Reliable lock solutions for homes, businesses, and urgent call-outs.",
                points: ["Residential and commercial locks", "Emergency call-out support"],
              },
              {
                title: "CCTV",
                service: "cctv",
                image: "https://houdini.co.za/wp-content/uploads/2024/01/cctv-3.png",
                description: "Tailored surveillance systems from standalone cameras to integrated monitoring.",
                points: ["System design and installation", "On-site or remote monitoring"],
              },
              {
                title: "Safes",
                service: "safes",
                image: "https://houdini.co.za/wp-content/uploads/2024/01/safe.png",
                description: "Protection for valuables with solutions matched to your security requirements.",
                points: ["Wall and floor safes", "SABS and insurance-approved options"],
              },
              {
                title: "Intercoms",
                service: "intercoms",
                image: "https://houdini.co.za/wp-content/uploads/2024/01/safe-1.png",
                description: "Connected entry communication for homes, offices, and controlled-access sites.",
                points: ["Application-specific systems", "Clearer visitor management"],
              },
              {
                title: "Electric Fencing",
                service: "electric-fencing",
                image: "https://houdini.co.za/wp-content/uploads/2024/01/fence.png",
                description: "A strong perimeter layer designed to deter intrusion before it reaches your property.",
                points: ["Perimeter security planning", "Electric fencing and detection"],
              },
              {
                title: "Keys",
                service: "keys",
                image: "https://houdini.co.za/wp-content/uploads/2024/01/fence-2.png",
                description: "Key cutting and access solutions from everyday keys to restricted systems.",
                points: ["Cylinder and vehicle keys", "Master-keyed and restricted keyways"],
              },
            ].map((item) => (
              <button
                key={item.service}
                type="button"
                onClick={() => {
                  setFormData((previous) => ({ ...previous, service: item.service }));
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                }}
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
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-400">
                {["Locks", "CCTV", "Safes", "Intercoms", "Electric Fencing", "Keys"].map((service) => (
                  <li key={service}><a href="#services" className="transition hover:text-lime-400">{service}</a></li>
                ))}
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
