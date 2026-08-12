import { content } from "./content";
import { Footer } from "./components/Footer";
import { Gutter } from "./components/Gutter";
import { Header } from "./components/Header";
import { FeatureSection } from "./components/FeatureSection";

export default function App() {
  return (
    <div id="top" className="bg-surface text-text-primary">
      <Header />
      <Gutter />
      <main className="mx-auto max-w-5xl px-6 md:pl-16">
        <p className="py-24 font-display text-2xl">Swapyard</p>
        {content.features.map((feature, index) => (
          <FeatureSection key={feature.label} {...feature} reverse={index % 2 === 1} />
        ))}
      </main>
      <Footer />
    </div>
  );
}
