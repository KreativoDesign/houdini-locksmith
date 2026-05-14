'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, ArrowRight, Menu, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "locksmithing",
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
        service: "locksmithing",
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

      {/* Hero Section with Circular Service Layout */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
                  +27 (0) 11 234 5678
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

            {/* Right side - Circular service layout with mascot */}
            <div className="relative h-96 sm:h-[500px] flex items-center justify-center">
              {/* Central mascot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-transparent-6qhv2s27tRBVoVJE9CrijX.webp" 
                  alt="Houdini Mascot" 
                  className="w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-2xl animate-pulse"
                />
              </div>

              {/* Circular service icons */}
              {/* Locksmithing - Top */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
                <div className="bg-slate-800/80 backdrop-blur border border-lime-500/40 rounded-full p-4 hover:border-lime-400 transition group cursor-pointer">
                  <img 
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-locksmithing-3d-FQuPGhiEjxVmXiQgPszvX9.webp" 
                    alt="Locksmithing" 
                    className="w-16 h-16 object-contain group-hover:scale-110 transition"
                  />
                </div>
                <p className="text-center text-sm font-semibold mt-2 text-gray-300">Locksmithing</p>
              </div>

              {/* Security - Right */}
              <div className="absolute right-0 top-1/2 transform translate-x-8 -translate-y-1/2">
                <div className="bg-slate-800/80 backdrop-blur border border-lime-500/40 rounded-full p-4 hover:border-lime-400 transition group cursor-pointer">
                  <img 
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-security-3d-Cpoog8RKoadJUYevMgmZDo.webp" 
                    alt="Security Systems" 
                    className="w-16 h-16 object-contain group-hover:scale-110 transition"
                  />
                </div>
                <p className="text-center text-sm font-semibold mt-2 text-gray-300 whitespace-nowrap">Security</p>
              </div>

              {/* Diagnostics - Bottom */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8">
                <div className="bg-slate-800/80 backdrop-blur border border-lime-500/40 rounded-full p-4 hover:border-lime-400 transition group cursor-pointer">
                  <img 
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-diagnostics-3d-jp3f9Fg5YKHwQEiFb8T7gs.webp" 
                    alt="Diagnostics" 
                    className="w-16 h-16 object-contain group-hover:scale-110 transition"
                  />
                </div>
                <p className="text-center text-sm font-semibold mt-2 text-gray-300">Diagnostics</p>
              </div>

              {/* Left - Additional service indicator */}
              <div className="absolute left-0 top-1/2 transform -translate-x-8 -translate-y-1/2">
                <div className="bg-gradient-to-r from-lime-500/20 to-transparent border border-lime-500/30 rounded-full p-3">
                  <div className="w-12 h-12 rounded-full bg-lime-500/20 flex items-center justify-center">
                    <span className="text-lime-400 font-bold">+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Detail Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Complete Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">Solutions</span>
            </h2>
            <p className="text-xl text-gray-400">Professional services tailored to your needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Locksmithing */}
            <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 transition group">
              <div className="mb-6">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-locksmithing-3d-FQuPGhiEjxVmXiQgPszvX9.webp" 
                  alt="Locksmithing" 
                  className="w-20 h-20 object-contain group-hover:scale-110 transition"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4">Locksmithing</h3>
              <p className="text-gray-400 mb-6">
                Expert lock installation, repair, and emergency unlocking services for residential and commercial properties.
              </p>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  Residential locks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  Commercial systems
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  Emergency lockout
                </li>
              </ul>
            </div>

            {/* Security Systems */}
            <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 transition group">
              <div className="mb-6">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-security-3d-Cpoog8RKoadJUYevMgmZDo.webp" 
                  alt="Security Systems" 
                  className="w-20 h-20 object-contain group-hover:scale-110 transition"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4">Security Systems</h3>
              <p className="text-gray-400 mb-6">
                Advanced alarm systems, CCTV installation, and smart home integration for complete peace of mind.
              </p>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  Alarm systems
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  CCTV cameras
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  Smart integration
                </li>
              </ul>
            </div>

            {/* Diagnostics */}
            <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 transition group">
              <div className="mb-6">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-diagnostics-3d-jp3f9Fg5YKHwQEiFb8T7gs.webp" 
                  alt="Diagnostics" 
                  className="w-20 h-20 object-contain group-hover:scale-110 transition"
                />
              </div>
              <h3 className="text-2xl font-bold mb-4">Diagnostics & Maintenance</h3>
              <p className="text-gray-400 mb-6">
                Comprehensive system diagnostics, maintenance, and troubleshooting to keep your security running smoothly.
              </p>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  System testing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  Maintenance plans
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                  24/7 support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">Touch</span>
            </h2>
            <p className="text-xl text-gray-400">Our sales team is ready to help you find the perfect solution</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <Input
                    type="tel"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Service Interest</label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-lime-500/30 focus:border-lime-500 rounded-md text-white"
                  >
                    <option value="locksmithing">Locksmithing</option>
                    <option value="security">Security Systems</option>
                    <option value="diagnostics">Diagnostics & Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <Textarea
                  placeholder="Tell us about your security needs..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="bg-slate-900/50 border-lime-500/30 focus:border-lime-500 text-white placeholder-gray-500"
                  rows={5}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold py-3 text-lg shadow-lg shadow-lime-500/50"
              >
                {isSubmitting ? "Sending..." : "Send Inquiry"}
              </Button>
            </form>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Phone className="w-8 h-8 text-lime-400 mx-auto mb-3" />
              <p className="text-gray-300">+27 (0) 11 234 5678</p>
            </div>
            <div className="text-center">
              <Mail className="w-8 h-8 text-lime-400 mx-auto mb-3" />
              <p className="text-gray-300">info@houdini.co.za</p>
            </div>
            <div className="text-center">
              <MapPin className="w-8 h-8 text-lime-400 mx-auto mb-3" />
              <p className="text-gray-300">Johannesburg, South Africa</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-lime-500/20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">© 2026 Houdini Locksmith & Security. We Lock Your World. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
