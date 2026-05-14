import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Shield, Clock, Users } from "lucide-react";

export default function ServiceSecurity() {
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
          <h1 className="text-2xl font-bold text-white">Security Systems</h1>
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
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-security-transparent_e87806f7.png"
                  alt="Security Systems"
                  className="w-32 h-32 object-contain relative z-10"
                />
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              Advanced <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">Security Systems</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Comprehensive surveillance and alarm systems with 24/7 monitoring and mobile app integration for complete peace of mind
            </p>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-12">Our Security Solutions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "CCTV Installation & Monitoring",
                description:
                  "State-of-the-art surveillance systems with HD cameras, cloud storage, and 24/7 professional monitoring.",
                features: [
                  "4K HD cameras",
                  "Cloud storage & backup",
                  "24/7 professional monitoring",
                  "Mobile app access",
                ],
              },
              {
                title: "Alarm System Design",
                description:
                  "Custom-designed alarm systems tailored to your property layout and security needs with instant alerts.",
                features: [
                  "Motion detection",
                  "Door & window sensors",
                  "Instant mobile alerts",
                  "Professional response",
                ],
              },
              {
                title: "Access Control Systems",
                description:
                  "Modern access control solutions including keycard, biometric, and mobile app-based entry systems.",
                features: [
                  "Keycard access",
                  "Biometric authentication",
                  "Mobile app entry",
                  "Audit logs & reporting",
                ],
              },
              {
                title: "Mobile App Integration",
                description:
                  "Seamless integration with mobile applications for real-time monitoring, alerts, and system control from anywhere.",
                features: [
                  "Real-time notifications",
                  "Live camera feeds",
                  "Remote system control",
                  "Historical event logs",
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
          <h3 className="text-3xl font-bold mb-12">Why Choose Houdini Security</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "24/7 Monitoring",
                description: "Round-the-clock professional monitoring and rapid response to any security events",
              },
              {
                icon: Users,
                title: "Expert Installation",
                description: "Professional technicians with years of experience in security system design and installation",
              },
              {
                icon: Shield,
                title: "Peace of Mind",
                description: "Advanced technology and professional support for complete security coverage",
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
                title: "Corporate Office Security Upgrade",
                description:
                  "Installed comprehensive CCTV system with 50+ cameras and access control for 5-floor corporate office.",
                result: "50+ cameras deployed",
              },
              {
                title: "Retail Chain Monitoring",
                description:
                  "Implemented centralized monitoring system for 20 retail locations with real-time alerts and mobile access.",
                result: "20 locations monitored",
              },
              {
                title: "Warehouse Security System",
                description:
                  "Custom alarm and CCTV system for large warehouse with motion detection and perimeter monitoring.",
                result: "99.9% uptime",
              },
              {
                title: "Residential Complex Protection",
                description:
                  "Multi-building security system with access control and 24/7 monitoring for 200-unit residential complex.",
                result: "200 units protected",
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
          <h3 className="text-4xl font-bold mb-6">Protect What Matters Most</h3>
          <p className="text-xl text-gray-400 mb-8">
            Let our security experts design a custom system for your property
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
