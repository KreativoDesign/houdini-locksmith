'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Shield, Zap, CheckCircle2, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Landing() {
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/64902_0b05b88d.png" 
              alt="Houdini Logo" 
              className="h-10 w-auto"
            />
          </div>
          <div className="flex gap-4">
            <a href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
              Login
            </a>
            <Button className="bg-lime-500 hover:bg-lime-600 text-black font-semibold">Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 sm:py-32 overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                We Lock Your World
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Professional locksmithing, advanced security systems, and rapid emergency response. Protecting South Africa's homes and businesses with expertise and integrity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-lime-500 hover:bg-lime-600 text-black font-semibold"
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Request a Quote <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white/10"
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Call Now
                </Button>
              </div>
            </div>
            
            {/* Mascot */}
            <div className="flex justify-center md:justify-end">
              <img 
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/64903_afb0cc77.png" 
                alt="Houdini Mascot" 
                className="w-80 h-80 object-contain drop-shadow-2xl animate-bounce"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">Comprehensive security and locksmith solutions for every need</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Locksmithing Service */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 overflow-hidden">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/locksmithing-service-KVedMdnetysbVQBJXobhqL.webp" 
                  alt="Locksmithing Service" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-8 h-8 text-lime-500" />
                  <h3 className="text-2xl font-bold text-gray-900">Locksmithing</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Expert lock installation, repair, and emergency unlocking services for residential and commercial properties.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    Residential locks
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    Commercial systems
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    Emergency lockout
                  </li>
                </ul>
              </div>
            </div>

            {/* Security Systems */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 overflow-hidden">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/security-systems-service-o4TwFiequ8vbp3pLm6DGHS.webp" 
                  alt="Security Systems" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-lime-500" />
                  <h3 className="text-2xl font-bold text-gray-900">Security Systems</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Advanced alarm systems, CCTV installation, and smart home integration for complete peace of mind.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    Alarm systems
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    CCTV cameras
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    Smart integration
                  </li>
                </ul>
              </div>
            </div>

            {/* Diagnostics & Maintenance */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 overflow-hidden">
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/diagnostics-service-229SA4tJkMq6g4n4Xmyu9m.webp" 
                  alt="Diagnostics & Maintenance" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-8 h-8 text-lime-500" />
                  <h3 className="text-2xl font-bold text-gray-900">Diagnostics</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Comprehensive system diagnostics, maintenance, and troubleshooting to keep your security running smoothly.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    System testing
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    Maintenance plans
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                    24/7 support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-lime-500 mb-2">500+</div>
              <p className="text-gray-600">Satisfied Customers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-lime-500 mb-2">15 min</div>
              <p className="text-gray-600">Average Response Time</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-lime-500 mb-2">24/7</div>
              <p className="text-gray-600">Emergency Support</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-lime-500 mb-2">100%</div>
              <p className="text-gray-600">Satisfaction Guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600">Our sales team is ready to help you find the perfect solution</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <Input
                    type="tel"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Interest</label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  >
                    <option value="locksmithing">Locksmithing</option>
                    <option value="security">Security Systems</option>
                    <option value="diagnostics">Diagnostics & Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <Textarea
                  placeholder="Tell us about your security needs..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold py-3 text-lg"
              >
                {isSubmitting ? "Sending..." : "Send Inquiry"}
              </Button>
            </form>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Phone className="w-8 h-8 text-lime-500" />
              <p className="text-gray-600">+27 (0) 11 234 5678</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Mail className="w-8 h-8 text-lime-500" />
              <p className="text-gray-600">info@houdini.co.za</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 text-lime-500" />
              <p className="text-gray-600">Johannesburg, South Africa</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2026 Houdini Locksmith & Security. We Lock Your World. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
