import { Composition, Folder, Still } from "remotion";
import { CharacterHero, CharacterSheet } from "./CharacterSheet";
import { Reel } from "./reel/Reel";
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
        durationInFrames={1301}
      />
      <Folder name="Scenes">
        <Composition id="Intro" component={IntroScene} width={1080} height={1920} fps={30} durationInFrames={135} />
        <Composition id="Fronte" component={FrontScene} width={1080} height={1920} fps={30} durationInFrames={165} />
        <Composition id="Lato" component={SideScene} width={1080} height={1920} fps={30} durationInFrames={165} />
        <Composition id="DallAlto" component={TopViewScene} width={1080} height={1920} fps={30} durationInFrames={150} />
        <Composition id="Sbagliato" component={WrongScene} width={1080} height={1920} fps={30} durationInFrames={210} />
        <Composition id="Corretto" component={CorrectScene} width={1080} height={1920} fps={30} durationInFrames={225} />
        <Composition id="Rischi" component={RiskScene} width={1080} height={1920} fps={30} durationInFrames={210} />
        <Composition id="Segui" component={OutroScene} width={1080} height={1920} fps={30} durationInFrames={135} />
      </Folder>
      <Folder name="Character">
        <Still id="CharacterHero" component={CharacterHero} width={1080} height={1920} />
        <Still id="CharacterSheet" component={CharacterSheet} width={1080} height={1920} />
      </Folder>
    </>
  );
};
