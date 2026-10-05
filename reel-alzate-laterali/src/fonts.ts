import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const fontFamily = "Poppins";

for (const weight of ["600", "800"]) {
  loadFont({
    family: fontFamily,
    url: staticFile(`fonts/poppins-latin-${weight}-normal.woff2`),
    weight,
  });
}
