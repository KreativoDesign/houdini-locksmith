import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Shield, Clock, Users } from "lucide-react";

export default function ServiceDiagnostics() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-lime-500/20 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-gray-400 hover:text-lime-400 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <h1 className="text-2xl font-bold text-white">Diagnostics & Maintenance</h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-50"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(132, 204, 22, 0.8) 0%, transparent 70%)",
                  }}
                />
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-diagnostics-transparent_ea7907e6.png"
                  alt="Diagnostics"
                  className="w-32 h-32 object-contain relative z-10"
                />
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              System <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">Diagnostics & Maintenance</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Comprehensive system diagnostics and preventive maintenance to ensure your security infrastructure operates at peak performance
            </p>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-12">Our Diagnostic Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "System Diagnostics",
                description:
                  "Comprehensive analysis of your security systems to identify potential issues before they become problems.",
                features: [
                  "Full system audits",
                  "Performance testing",
                  "Vulnerability assessment",
                  "Detailed reports",
                ],
              },
              {
                title: "Preventive Maintenance",
                description:
                  "Regular maintenance programs designed to keep your systems running smoothly and prevent costly downtime.",
                features: [
                  "Scheduled inspections",
                  "Component testing",
                  "Software updates",
                  "Performance optimization",
                ],
              },
              {
                title: "Performance Optimization",
                description:
                  "Fine-tune your security systems for maximum efficiency and reliability with our optimization services.",
                features: [
                  "System tuning",
                  "Configuration review",
                  "Efficiency improvements",
                  "Cost reduction",
                ],
              },
              {
                title: "Emergency Repairs",
                description:
                  "Rapid response to system failures and emergencies with our expert technical support team.",
                features: [
                  "24/7 emergency support",
                  "Rapid diagnosis",
                  "Quick repairs",
                  "Minimal downtime",
                ],
              },
            ].map((service, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 transition"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-lime-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h4 className="text-xl font-bold mb-2 text-white">{service.title}</h4>
                    <p className="text-gray-400 mb-4">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-lime-400 rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-12">Why Choose Houdini Diagnostics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Preventive Approach",
                description: "Catch problems early before they impact your security and operations",
              },
              {
                icon: Users,
                title: "Expert Technicians",
                description: "Certified specialists with deep knowledge of all security system types",
              },
              {
                icon: Shield,
                title: "Guaranteed Performance",
                description: "Ensure your systems perform reliably with our comprehensive maintenance plans",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4">
                    <Icon className="w-12 h-12 text-lime-400" />
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-white">{item.title}</h4>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-12">Case Studies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Critical System Failure Prevention",
                description:
                  "Identified and resolved critical hardware issues during routine diagnostics, preventing complete system failure.",
                result: "Prevented $50K+ in downtime",
              },
              {
                title: "Legacy System Optimization",
                description:
                  "Optimized aging security infrastructure for modern performance standards with targeted upgrades.",
                result: "40% performance improvement",
              },
              {
                title: "Preventive Maintenance Program",
                description:
                  "Implemented comprehensive maintenance program for large facility reducing emergency repairs by 85%.",
                result: "85% reduction in emergencies",
              },
              {
                title: "System Integration & Upgrade",
                description:
                  "Diagnosed compatibility issues and successfully integrated new systems with existing infrastructure.",
                result: "Seamless integration completed",
              },
            ].map((study, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur border border-lime-500/20 rounded-xl p-8 hover:border-lime-500/50 transition"
              >
                <h4 className="text-xl font-bold mb-3 text-white">{study.title}</h4>
                <p className="text-gray-400 mb-4">{study.description}</p>
                <div className="pt-4 border-t border-lime-500/20">
                  <p className="text-lime-400 font-semibold">{study.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-bold mb-6">Keep Your Systems Running Smoothly</h3>
          <p className="text-xl text-gray-400 mb-8">
            Schedule a comprehensive diagnostic today and ensure peak performance
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/#contact")}
              className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold px-8 py-6 text-lg"
            >
              Get in Touch
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10 px-8 py-6 text-lg"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
