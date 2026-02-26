import HeroSection from "@/components/HeroSection";
import StatsRow from "@/components/StatsRow";
import HowItWorks from "@/components/HowItWorks";
import CREMonitoring from "@/components/CREMonitoring";
import CREWorkflowSection from "@/components/CREWorkflowSection";
import Dashboard from "@/components/Dashboard";
import WhatGetsExecuted from "@/components/WhatGetsExecuted";
import ArchitectureSection from "@/components/ArchitectureSection";
import WhyThisExists from "@/components/WhyThisExists";
import Footer from "@/components/Footer";

const Index = () => (
  <div className="min-h-screen bg-background scroll-smooth">
    <HeroSection />
    <StatsRow />
    <HowItWorks />
    <CREMonitoring />
    <CREWorkflowSection />
    <Dashboard />
    <WhatGetsExecuted />
    <ArchitectureSection />
    <WhyThisExists />
    <Footer />
  </div>
);

export default Index;
