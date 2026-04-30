import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  Tablet,
  RotateCcw,
  Camera,
  Users,
  Play,
  Shield,
  Mic,
  Sparkles,
  Box,
  Upload,
  MessageCircle,
  BarChart3,
  Menu,
  ChevronDown,
  Video,
  Footprints,
  Activity
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName: _currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core navigation items - always visible
  const coreNavItems = [
    { name: "Home", url: createPageUrl("Home"), icon: Home },
    { name: "Routines", url: createPageUrl("Routines"), icon: RotateCcw },
    { name: "Begeleiding", url: "/StepByStepRoutine", icon: Footprints },
    { name: "Memory Album", url: createPageUrl("MemoryAlbum"), icon: Camera },
    { name: "Gouden Momenten", url: createPageUrl("GoudenMomenten"), icon: Play },
    { name: "Caregiver", url: createPageUrl("Caregiver"), icon: Users },
  ];

  // Additional items grouped under "Meer Opties"
  const moreOptionsItems = [
    { 
      name: "AI Assistenten", 
      items: [
        { name: "Spraakassistent", url: createPageUrl("VoiceHome"), icon: Mic },
        { name: "Talk 2.0", url: createPageUrl("Talk2_0"), icon: Sparkles },
        { name: "Gesprekspartner", url: createPageUrl("Gesprekspartner"), icon: MessageCircle },
      ]
    },
    { 
      name: "Routines", 
      items: [
        { name: "Routines 2.0", url: createPageUrl("Routines2_0"), icon: Sparkles },
      ]
    },
    { 
      name: "Professioneel", 
      items: [
        { name: "ICF Upload", url: createPageUrl("ICFUpload"), icon: Upload },
        { name: "ICF Dashboard", url: createPageUrl("ICFInterviewDashboard"), icon: BarChart3 },
        { name: "Day Simulator", url: createPageUrl("PatientDaySimulator"), icon: Activity },
      ]
    },
    { 
      name: "Extra", 
      items: [
        { name: "Over Ons", url: createPageUrl("About"), icon: Sparkles },
        { name: "Videos", url: createPageUrl("Videos"), icon: Video },
        { name: "Mijn 3D Thuis", url: createPageUrl("My3DHome"), icon: Box },
        { name: "Thuis Scherm", url: createPageUrl("PatientDevice"), icon: Tablet },
        { name: "Privacy", url: createPageUrl("Privacy"), icon: Shield },
      ]
    },
  ];

  // All items for mobile menu
  const allNavItems = [
    ...coreNavItems,
    ...moreOptionsItems.flatMap(group => group.items)
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-lato">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@300;400;500;600&display=swap');
        
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-lato { font-family: 'Lato', sans-serif; }
        
        .focus-strong:focus {
          outline: 3px solid #EC4899;
          outline-offset: 2px;
          border-radius: 8px;
        }
        
        .tap-target {
          min-height: 48px;
          min-width: 48px;
        }
        
        @media (prefers-contrast: high) {
          .bg-slate-50 { background-color: white; }
          .text-gray-600 { color: black; }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-spin { animation: none; }
          .transition-all { transition: none; }
        }
      `}</style>

      {/* Desktop Navigation */}
      <nav className="bg-white border-b-2 border-blue-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("About")} className="flex items-center space-x-3 focus-strong rounded-lg p-2 hover:bg-blue-50 transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="font-inter font-bold text-xl text-gray-900 hidden sm:block">Prettig Thuis</span>
            </Link>

            {/* Desktop Navigation Items */}
            <div className="hidden lg:flex items-center space-x-1">
              {coreNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.url}
                  className={`tap-target px-4 py-2 rounded-lg font-medium transition-all focus-strong flex items-center space-x-2 ${
                    location.pathname === item.url
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              ))}

              {/* Meer Opties Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="tap-target px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus-strong flex items-center space-x-2"
                  >
                    <span className="text-sm">Meer Opties</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {moreOptionsItems.map((group, groupIndex) => (
                    <React.Fragment key={group.name}>
                      <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
                        {group.name}
                      </DropdownMenuLabel>
                      {group.items.map((item) => (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            to={item.url}
                            className={`flex items-center space-x-2 px-2 py-2 cursor-pointer ${
                              location.pathname === item.url ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      {groupIndex < moreOptionsItems.length - 1 && <DropdownMenuSeparator />}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="tap-target focus-strong">
                    <Menu className="w-6 h-6 text-gray-700" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="font-inter font-bold text-xl text-left">
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-1">
                    {allNavItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors tap-target ${
                          location.pathname === item.url
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 leading-relaxed">
              Dit is een educatieve app en vervangt geen medisch advies. 
              Raadpleeg altijd je arts voor gezondheidskwesties.
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <Link to={createPageUrl("Privacy")} className="text-blue-600 hover:text-blue-700 focus-strong">
                Privacy
              </Link>
              <a href="mailto:info@prettigthuis.nl" className="text-blue-600 hover:text-blue-700 focus-strong">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
