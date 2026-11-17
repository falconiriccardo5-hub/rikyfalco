import { Composition } from "remotion";
import { STORY_FRAMES, Story } from "./Story";

export const RemotionRoot: React.FC = () => (
  <Composition id="StoryPiedi" component={Story} width={1080} height={1920} fps={30} durationInFrames={STORY_FRAMES} />
);
