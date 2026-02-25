import HeroSection from "@/components/HeroSection";
import StatsRow from "@/components/StatsRow";
import HowItWorks from "@/components/HowItWorks";
import Dashboard from "@/components/Dashboard";
import CREMonitoring from "@/components/CREMonitoring";
import WhatGetsExecuted from "@/components/WhatGetsExecuted";
import WhyThisExists from "@/components/WhyThisExists";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen bg-background scroll-smooth">
    <HeroSection />
    <StatsRow />
    <HowItWorks />
    <Dashboard />
    <CREMonitoring />
    <WhatGetsExecuted />
    <WhyThisExists />
    <Footer />
  </div>
);

export default Index;
