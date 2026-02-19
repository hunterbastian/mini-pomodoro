import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Polygon, Rect } from "react-native-svg";

export function PixelSceneryBackground() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <Svg
        height="100%"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={styles.svg}
        viewBox="0 0 160 100"
        width="100%"
      >
        <Defs>
          <Pattern height="4" id="pixelDither" patternUnits="userSpaceOnUse" width="4">
            <Rect fill="#ffffff" fillOpacity={0.08} height="1" width="1" x="0" y="0" />
            <Rect fill="#ffffff" fillOpacity={0.06} height="1" width="1" x="2" y="1" />
            <Rect fill="#000000" fillOpacity={0.05} height="1" width="1" x="1" y="3" />
            <Rect fill="#000000" fillOpacity={0.04} height="1" width="1" x="3" y="2" />
          </Pattern>
        </Defs>

        <Rect fill="#4e77a8" height="24" width="160" x="0" y="0" />
        <Rect fill="#5f8cbb" height="22" width="160" x="0" y="24" />
        <Rect fill="#74a8d1" height="18" width="160" x="0" y="46" />
        <Rect fill="#cf8f62" height="16" width="160" x="0" y="64" />
        <Rect fill="#ecb57f" height="20" width="160" x="0" y="80" />

        <Rect fill="#ffd27b" height="12" width="12" x="124" y="10" />
        <Rect fill="#ffe8aa" height="8" width="8" x="126" y="12" />

        <Rect fill="#f1f6fb" height="6" width="28" x="16" y="14" />
        <Rect fill="#f1f6fb" height="6" width="14" x="22" y="8" />
        <Rect fill="#d8e5ef" height="4" width="10" x="34" y="14" />

        <Rect fill="#f1f6fb" height="6" width="24" x="102" y="20" />
        <Rect fill="#f1f6fb" height="6" width="12" x="108" y="14" />
        <Rect fill="#d8e5ef" height="4" width="8" x="118" y="20" />

        <Polygon
          fill="#6a8fb0"
          points="0,100 0,70 14,78 26,64 40,76 56,58 73,74 90,52 112,72 132,60 148,70 160,64 160,100"
        />

        <Polygon
          fill="#4f7695"
          points="0,100 0,82 18,90 34,78 52,88 70,72 92,90 116,74 138,86 160,78 160,100"
        />

        <Rect fill="#3f6077" height="8" width="160" x="0" y="92" />
        <Rect fill="#83b26f" height="1" width="5" x="4" y="91" />
        <Rect fill="#7eaf6c" height="1" width="6" x="18" y="91" />
        <Rect fill="#86b872" height="1" width="4" x="33" y="91" />
        <Rect fill="#7bab66" height="1" width="5" x="50" y="91" />
        <Rect fill="#88bb74" height="1" width="7" x="68" y="91" />
        <Rect fill="#7faf6a" height="1" width="6" x="89" y="91" />
        <Rect fill="#84b570" height="1" width="5" x="110" y="91" />
        <Rect fill="#7cad67" height="1" width="7" x="130" y="91" />
        <Rect fill="#86b772" height="1" width="5" x="148" y="91" />

        <Rect fill="url(#pixelDither)" height="100" width="160" x="0" y="0" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
