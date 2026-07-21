import Link from "next/link";
import {
  QrCode,
  Monitor,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform duration-200">
              S
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                SynQ
              </span>
              <span className="text-[10px] font-semibold text-brand-600 tracking-widest uppercase block -mt-0.5">
                Real-Time QMS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-brand-600 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-brand-600 transition-colors">
              Features
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="primary" size="sm" className="hidden sm:inline-flex rounded-full px-5">
                Sign In <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="primary" size="sm" className="sm:hidden rounded-full px-4">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none -z-10 opacity-70">
          <div className="absolute top-[-10%] left-[20%] w-[35rem] h-[35rem] rounded-full bg-brand-200/50 blur-[120px]" />
          <div className="absolute top-[10%] right-[10%] w-[25rem] h-[25rem] rounded-full bg-emerald-100/50 blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold">
              <Sparkles size={13} className="text-brand-600" />
              Skip the long queues and save time
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              Skip the waiting room. <br />
              <span className="bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent">
                Join from anywhere.
              </span>
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
              Set up your counters and services, then share a QR code at your venue. Customers scan it to join instantly and track their position in real-time — no app, no public sign-up page.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                  <QrCode size={18} />
                  Sign In
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl flex items-center justify-center gap-2 bg-white">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-400 to-emerald-400 rounded-3xl filter blur-3xl opacity-20 -z-10" />
            
            {/* Interactive Phone Mockup */}
            <div className="relative w-80 rounded-[2.5rem] border-[8px] border-slate-900 bg-slate-950 p-3 shadow-2xl overflow-hidden aspect-[9/18]">
              {/* Speaker & Camera bar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-800 rounded-full mb-1" />
              </div>

              {/* Dynamic screen content */}
              <div className="h-full bg-slate-50 rounded-[1.8rem] pt-6 px-4 flex flex-col justify-between overflow-y-auto">
                {/* Simulated App Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold">
                      S
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">SynQ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] text-slate-500 font-medium">Live sync</span>
                  </div>
                </div>

                {/* Ticket Body */}
                <div className="my-auto space-y-4 py-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center relative overflow-hidden">
                    {/* Punch holes in ticket */}
                    <div className="absolute -left-2 top-[55%] -translate-y-1/2 h-4 w-4 rounded-full bg-slate-50 border-r border-slate-200" />
                    <div className="absolute -right-2 top-[55%] -translate-y-1/2 h-4 w-4 rounded-full bg-slate-50 border-l border-slate-200" />

                    <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Customer Service</p>
                    <p className="text-4xl font-extrabold text-slate-900 my-1.5 tracking-tight">CS-042</p>
                    
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-100 animate-pulse">
                      Calling Now
                    </span>

                    <div className="border-t border-dashed border-slate-150 my-3 pt-3">
                      <div className="flex items-center justify-center gap-1.5 text-brand-600 font-medium text-xs">
                        <Monitor size={12} />
                        <span>Go to Counter 3</span>
                      </div>
                    </div>
                  </div>

                  {/* Status update alert simulated */}
                  <div className="bg-brand-600 text-white rounded-lg p-2.5 text-[10px] text-center font-medium shadow-sm animate-bounce">
                    🔔 It&apos;s your turn!
                  </div>
                </div>

                {/* Bottom hints */}
                <div className="pb-3 text-center">
                  <p className="text-[8px] text-slate-400">Updates automatically in real time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-100 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-brand-600 text-sm font-bold tracking-widest uppercase">Simple Process</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">
              How it works
            </p>
            <p className="text-slate-500 text-sm sm:text-base">
              Get in line in under a minute without needing to touch a paper ticket.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="text-center space-y-3 group">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900">Scan the Code</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan the QR code displayed at the venue by staff to open your personal ticket page.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-3 group">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900">Select Service</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose the service category you need and input your name to generate a custom ticket.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-3 group">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900">Wait Comfortably</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Monitor your position live on your screen. You are free to walk around or grab a coffee.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center space-y-3 group">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform shadow-sm">
                4
              </div>
              <h3 className="font-bold text-slate-900">Get Notified</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive visual alerts and vibrations once your number is called. Walk to the counter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-brand-600 text-sm font-bold tracking-widest uppercase">Features</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">
              Modern Queue Management
            </p>
            <p className="text-slate-500 text-sm sm:text-base">
              A robust set of customer-facing features built for responsiveness and ease of use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4 hover:shadow-md transition-shadow border-slate-200/60 bg-white">
              <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Real-Time Updates</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Powered by live database synchronization. Your browser updates immediately as soon as staff calls a ticket.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-md transition-shadow border-slate-200/60 bg-white">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bell size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Haptic & Sound Alerts</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Receive direct vibrations on mobile browsers when it&apos;s your turn, helping you avoid missing your call.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-md transition-shadow border-slate-200/60 bg-white">
              <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Smartphone size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">App-Free Access</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                No apps or plugins to download. The system runs fully inside any modern mobile or desktop web browser.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-md transition-shadow border-slate-200/60 bg-white">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Multi-Service Routing</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Route customers to different counters dynamically based on their specific request type (CS, Sales, etc.).
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-md transition-shadow border-slate-200/60 bg-white">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Secure & Private</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Inputting names is optional. Your information is protected, and tickets are automatically archived.
              </p>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-md transition-shadow border-slate-200/60 bg-white">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Smooth Flow</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Reduces counter bottlenecking, crowd clustering, and lobby frustration for a cleaner customer experience.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-lg shadow-md">
              S
            </div>
            <span className="font-bold text-slate-200 tracking-tight">
              SynQ
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <a href="#how-it-works" className="hover:text-slate-200 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-slate-200 transition-colors">
              Features
            </a>
            <Link href="/login" className="hover:text-slate-200 transition-colors font-medium text-brand-400">
              Sign In
            </Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Eagleies Creative. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-[10px] tracking-wider uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-medium">
              V1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
