import { Still } from "remotion";
import { CharacterSheet, StyleCompare } from "./CharacterSheet";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still
        id="SheetCartoon"
        component={CharacterSheet}
        width={1080}
        height={1920}
        defaultProps={{ variant: "cartoon" as const }}
      />
      <Still
        id="SheetWhite"
        component={CharacterSheet}
        width={1080}
        height={1920}
        defaultProps={{ variant: "white" as const }}
      />
      <Still
        id="SheetSketch"
        component={CharacterSheet}
        width={1080}
        height={1920}
        defaultProps={{ variant: "sketch" as const }}
      />
      <Still id="StyleCompare" component={StyleCompare} width={1920} height={1080} />
    </>
  );
};
