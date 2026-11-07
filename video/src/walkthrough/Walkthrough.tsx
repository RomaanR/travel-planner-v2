import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { C } from "../theme";
import { CloseScene, ItineraryScene, NewsScene, SaveScene, StaysScene } from "./scenesB";
import { FormScene, GenerateScene, LandingScene, TitleScene } from "./scenesA";
import { LEN } from "./timing";

const ORDER: [keyof typeof LEN, React.FC][] = [
  ["title", TitleScene],
  ["landing", LandingScene],
  ["form", FormScene],
  ["generate", GenerateScene],
  ["itinerary", ItineraryScene],
  ["stays", StaysScene],
  ["save", SaveScene],
  ["news", NewsScene],
  ["close", CloseScene],
];

// A first-time visitor's tour of TravalBee: real captures of the live pages, plus animated rebuilds
// of the moments a still image cannot show (the form, generation, saving and sharing).
export const Walkthrough: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {ORDER.map(([key, Scene]) => {
        const start = from;
        from += LEN[key];
        return (
          <Sequence key={key} from={start} durationInFrames={LEN[key]}>
            <Scene />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
