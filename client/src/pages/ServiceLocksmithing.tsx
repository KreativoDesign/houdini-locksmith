import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Shield, Clock, Users } from "lucide-react";

export default function ServiceLocksmithing() {
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
          <h1 className="text-2xl font-bold text-white">Locksmithing Services</h1>
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
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/icon-locksmithing-transparent_f4c51513.png"
                  alt="Locksmithing"
                  className="w-32 h-32 object-contain relative z-10"
                />
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6 text-white">
              Expert <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">Locksmithing</span> Solutions
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Professional lock installation, repair, and emergency unlocking services for residential and commercial properties
            </p>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-lime-500/20">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold mb-12 text-white">Our Locksmithing Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Residential Lock Services",
                description:
                  "Complete lock installation, repair, and replacement for homes. Emergency lockout assistance available 24/7.",
                features: [
                  "Door lock installation & repair",
                  "Emergency lockout assistance",
                  "Lock rekeying services",
                  "High-security lock upgrades",
                ],
              },
              {
                title: "Commercial Security Locks",
                description:
                  "Advanced locking systems designed for businesses, offices, and commercial properties with high-security requirements.",
                features: [
                  "Master key systems",
                  "Access control locks",
                  "Commercial-grade hardware",
                  "Audit trail management",
                ],
              },
              {
                title: "Emergency Lockout Assistance",
                description:
                  "Fast response times for emergency lockouts. Our technicians are available around the clock to help you regain access.",
                features: [
                  "24/7 emergency response",
                  "Quick response times",
                  "Non-destructive entry",
                  "Damage-free solutions",
                ],
              },
              {
                title: "Master Key Systems",
                description:
                  "Sophisticated master key systems that provide convenient access control while maintaining security across multiple locks.",
                features: [
                  "System design & installation",
                  "Key management",
                  "Hierarchical access control",
                  "Maintenance & updates",
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
          <h3 className="text-3xl font-bold mb-12 text-white">Why Choose Houdini Locksmith</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "24/7 Availability",
                description: "Emergency locksmith services available around the clock for your peace of mind",
              },
              {
                icon: Users,
                title: "Expert Technicians",
                description: "Highly trained and certified locksmiths with years of industry experience",
              },
              {
                icon: Shield,
                title: "Guaranteed Security",
                description: "All work backed by our satisfaction guarantee and professional standards",
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
          <h3 className="text-3xl font-bold mb-12 text-white">Case Studies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Residential Complex Security Upgrade",
                description:
                  "Upgraded 50-unit apartment complex with master key system and high-security locks. Reduced unauthorized access incidents by 95%.",
                result: "95% reduction in security incidents",
              },
              {
                title: "Emergency Lockout Response",
                description:
                  "Responded to emergency lockout at commercial office within 15 minutes. Provided non-destructive entry solution.",
                result: "15-minute response time",
              },
              {
                title: "Commercial Office Rekey",
                description:
                  "Complete rekeying of 200+ locks across multi-floor office building following employee turnover.",
                result: "200+ locks rekeyed",
              },
              {
                title: "Retail Store Lock Installation",
                description:
                  "Installed commercial-grade locks and access control system for retail chain expansion.",
                result: "10 locations secured",
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
          <h3 className="text-4xl font-bold mb-6 text-white">Ready to Secure Your Property?</h3>
          <p className="text-xl text-gray-400 mb-8">
            Contact our expert locksmith team today for a free consultation
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
