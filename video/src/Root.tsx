import { Composition } from "remotion";
import { NewsPromo, TOTAL_FRAMES } from "./NewsPromo";
import { Walkthrough } from "./walkthrough/Walkthrough";
import { WALKTHROUGH_FRAMES } from "./walkthrough/timing";
import { LayoutCtx, VERTICAL } from "./walkthrough/kit";

export const FPS = 30;

// Same walkthrough, rendered for a phone: 1080 x 1920, tall window, tighter zooms.
const WalkthroughVertical: React.FC = () => (
  <LayoutCtx.Provider value={VERTICAL}>
    <Walkthrough />
  </LayoutCtx.Provider>
);

export const Root: React.FC = () => (
  <>
    <Composition id="NewsPromo" component={NewsPromo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="Walkthrough" component={Walkthrough} durationInFrames={WALKTHROUGH_FRAMES} fps={FPS} width={1920} height={1080} />
    <Composition id="WalkthroughVertical" component={WalkthroughVertical} durationInFrames={WALKTHROUGH_FRAMES} fps={FPS} width={1080} height={1920} />
  </>
);
