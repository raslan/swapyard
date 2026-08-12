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
      <Header />
      <Gutter />
      <main className="mx-auto max-w-5xl px-6 md:pl-16">
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
