import { Still } from "remotion";
import { CharacterHero, CharacterSheet } from "./CharacterSheet";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still id="CharacterHero" component={CharacterHero} width={1080} height={1920} />
      <Still id="CharacterSheet" component={CharacterSheet} width={1080} height={1920} />
    </>
  );
};
