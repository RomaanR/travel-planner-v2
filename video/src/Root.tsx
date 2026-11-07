import { Composition } from "remotion";
import { NewsPromo, TOTAL_FRAMES } from "./NewsPromo";
import { Walkthrough } from "./walkthrough/Walkthrough";
import { WALKTHROUGH_FRAMES } from "./walkthrough/timing";

export const FPS = 30;

export const Root: React.FC = () => (
  <>
    <Composition id="NewsPromo" component={NewsPromo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="Walkthrough" component={Walkthrough} durationInFrames={WALKTHROUGH_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
