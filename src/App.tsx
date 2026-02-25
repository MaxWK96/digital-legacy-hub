import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DemoModeProvider } from "@/context/DemoModeContext";
import DemoModeToggle from "@/components/DemoModeToggle";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 20_000,
    },
  },
})

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DemoModeProvider>
        <Toaster />
        <Sonner />
        {/* Fixed demo mode toggle + heartbeat button in top-right corner */}
        <DemoModeToggle />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DemoModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
