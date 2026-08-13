import { Aurora } from "./components/Aurora";
import { ConfigGenSection } from "./components/ConfigGenSection";
import { DiscoverSection } from "./components/DiscoverSection";
import { DownloadSection } from "./components/DownloadSection";
import { FitCheckSection } from "./components/FitCheckSection";
import { Footer } from "./components/Footer";
import { Gutter } from "./components/Gutter";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HistorySection } from "./components/HistorySection";
import { InstallSection } from "./components/InstallSection";
import { ManageSection } from "./components/ManageSection";
import { SafetySection } from "./components/SafetySection";

export default function App() {
  return (
    <div id="top" className="overflow-x-hidden bg-surface text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-void"
      >
        Skip to content
      </a>
      <Header />
      <Gutter />
      <main id="main-content">
        <Hero />
        <Aurora />
        <InstallSection />
        <DiscoverSection />
        <FitCheckSection />
        <DownloadSection />
        <ConfigGenSection />
        <HistorySection />
        <SafetySection />
        <ManageSection />
      </main>
      <Footer />
    </div>
  );
}
