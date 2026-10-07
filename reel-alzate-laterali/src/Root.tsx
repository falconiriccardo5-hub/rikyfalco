import { Composition, Folder, Still } from "remotion";
import { CharacterHero, CharacterSheet } from "./CharacterSheet";
import { WomanSheet } from "./WomanSheet";
import { Reel2 } from "./reel2/Reel2";
import { TOTAL_FRAMES2 } from "./reel2/timing";
import { Reel } from "./reel/Reel";
import { TIMING, TOTAL_FRAMES } from "./reel/timing";
import { CorrectScene } from "./reel/scenes/CorrectScene";
import { FrontScene } from "./reel/scenes/FrontScene";
import { IntroScene } from "./reel/scenes/IntroScene";
import { OutroScene } from "./reel/scenes/OutroScene";
import { RiskScene } from "./reel/scenes/RiskScene";
import { SideScene } from "./reel/scenes/SideScene";
import { TopViewScene } from "./reel/scenes/TopViewScene";
import { WrongScene } from "./reel/scenes/WrongScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelAlzateLaterali"
        component={Reel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={TOTAL_FRAMES}
      />
      <Composition
        id="ReelPesiTroppoGrossa"
        component={Reel2}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={TOTAL_FRAMES2}
      />
      <Folder name="Scenes">
        <Composition id="Intro" component={IntroScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.intro.duration} />
        <Composition id="Fronte" component={FrontScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.front.duration} />
        <Composition id="Lato" component={SideScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.side.duration} />
        <Composition id="DallAlto" component={TopViewScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.top.duration} />
        <Composition id="Sbagliato" component={WrongScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.wrong.duration} />
        <Composition id="Corretto" component={CorrectScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.correct.duration} />
        <Composition id="Rischi" component={RiskScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.risk.duration} />
        <Composition id="Segui" component={OutroScene} width={1080} height={1920} fps={30} durationInFrames={TIMING.outro.duration} />
      </Folder>
      <Folder name="Character">
        <Still id="CharacterHero" component={CharacterHero} width={1080} height={1920} />
        <Still id="CharacterSheet" component={CharacterSheet} width={1080} height={1920} />
        <Still id="WomanSheet" component={WomanSheet} width={1080} height={1920} />
      </Folder>
    </>
  );
};
