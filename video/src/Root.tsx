import { Composition } from "remotion";
import { NewsPromo, TOTAL_FRAMES } from "./NewsPromo";

export const FPS = 30;

export const Root: React.FC = () => (
  <Composition
    id="NewsPromo"
    component={NewsPromo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
