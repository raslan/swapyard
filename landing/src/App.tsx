import { content } from "./content";
import { Footer } from "./components/Footer";
import { Gutter } from "./components/Gutter";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { FeatureSection } from "./components/FeatureSection";
import { SafetySection } from "./components/SafetySection";
import { ManageSection } from "./components/ManageSection";
import { TechFacts } from "./components/TechFacts";

export default function App() {
  return (
    <div id="top" className="bg-surface text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-void"
      >
        Skip to content
      </a>
      <Header />
      <Gutter />
      <main id="main-content" className="mx-auto max-w-5xl px-6 md:pl-16">
        <Hero />
        {content.features.map((feature, index) => (
          <FeatureSection key={feature.label} {...feature} reverse={index % 2 === 1} />
        ))}
        <SafetySection />
        <ManageSection />
        <TechFacts />
      </main>
      <Footer />
    </div>
  );
}
