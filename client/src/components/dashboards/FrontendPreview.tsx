import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";

export function FrontendPreview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Frontend Website Preview</h1>
        <p className="text-muted-foreground mt-1">
          View the public-facing website as customers see it
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Preview Mode</p>
              <p className="text-sm text-blue-800 mt-1">
                You are viewing the frontend website as an admin. This is how customers see your business online.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Website Preview */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-8 text-white text-center">
              <h2 className="text-4xl font-bold mb-2">Houdini Locksmith & Security</h2>
              <p className="text-lg text-slate-300 mb-6">
                Professional locksmith and security solutions for your peace of mind
              </p>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Get a Quote
              </Button>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-2xl font-bold mb-4">Our Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: "Emergency Locksmith",
                    description: "24/7 emergency locksmith services",
                  },
                  {
                    title: "Security Systems",
                    description: "Professional security system installation",
                  },
                  {
                    title: "Key Duplication",
                    description: "Fast and reliable key duplication",
                  },
                ].map((service, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">{service.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-muted rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to get started?</h3>
              <p className="text-muted-foreground mb-4">
                Contact us today for a free quote on your locksmith or security needs
              </p>
              <div className="flex gap-2 justify-center">
                <Button>Request Quote</Button>
                <Button variant="outline">Contact Us</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Full Website */}
      <div className="flex justify-center">
        <Button variant="outline" size="lg">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Full Website
        </Button>
      </div>
    </div>
  );
}
