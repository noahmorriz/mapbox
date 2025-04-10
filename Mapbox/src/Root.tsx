import "./index.css";
import { Composition } from "remotion";
import { Composition as MapboxComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MapboxAnimation"
        component={MapboxComposition}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
