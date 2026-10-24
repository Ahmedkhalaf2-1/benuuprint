import dynamic from "next/dynamic";
import { Hero } from "./hero";
import { resolveGarmentModel, resolveProcessVideo } from "./hero-media";
import { StitchDivider } from "./primitives";
import { BrandStatement, Capabilities, Decoration, FabricStory, FinalCta, PortalShowcase, QualitySection, Transparency, TrustStrip, WorkSection } from "./sections-static";
import { WhatWeMake } from "./what-we-make";

/** Below-the-fold interactive sections are split into their own chunks; they still render on the server. */
const ProcessStory = dynamic(() => import("./process-story").then((m) => m.ProcessStory));
const BuilderPreview = dynamic(() => import("./builder-preview").then((m) => m.BuilderPreview));

export function Homepage() {
  return (
    <>
      <main>
        <Hero />
        <TrustStrip />
        <BrandStatement />
        <WhatWeMake />
        <ProcessStory videoSrc={resolveProcessVideo()} />
        <BuilderPreview modelSrc={resolveGarmentModel()} />
        <FabricStory />
        <Decoration />
        <StitchDivider className="py-4" />
        <QualitySection />
        <PortalShowcase />
        <Transparency />
        <Capabilities />
        <WorkSection />
        <FinalCta />
      </main>
    </>
  );
}
