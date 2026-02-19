import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from "react-native-svg";

export function PixelSceneryBackground() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <Svg height="100%" preserveAspectRatio="none" style={styles.svg} viewBox="0 0 100 100" width="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0%" stopColor="#1b263b" />
            <Stop offset="60%" stopColor="#3a506b" />
            <Stop offset="100%" stopColor="#a85e3a" />
          </LinearGradient>
        </Defs>

        <Rect fill="url(#sky)" height="100" width="100" x="0" y="0" />

        <Polygon
          fill="#1c3d5a"
          opacity="0.82"
          points="0,100 0,76 15,84 30,72 50,88 70,68 85,80 100,72 100,100"
        />

        <Polygon
          fill="#0d2538"
          points="0,100 0,84 20,92 40,80 60,96 80,84 100,92 100,100"
        />
      </Svg>

      <View style={[styles.cloud, styles.cloudOne]}>
        <View style={[styles.cloudPuff, styles.cloudPuffMain]} />
        <View style={[styles.cloudPuff, styles.cloudPuffTop]} />
        <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
      </View>

      <View style={[styles.cloud, styles.cloudTwo]}>
        <View style={[styles.cloudPuff, styles.cloudPuffMain]} />
        <View style={[styles.cloudPuff, styles.cloudPuffTop]} />
        <View style={[styles.cloudPuff, styles.cloudPuffRight]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    height: 54,
    position: "absolute",
    width: 162,
  },
  cloudOne: {
    left: "9%",
    opacity: 0.9,
    top: "10%",
    transform: [{ scale: 1.1 }],
  },
  cloudPuff: {
    backgroundColor: "#f1faee",
    position: "absolute",
  },
  cloudPuffMain: {
    height: 24,
    left: 22,
    top: 22,
    width: 100,
  },
  cloudPuffRight: {
    height: 24,
    left: 70,
    top: 22,
    width: 48,
  },
  cloudPuffTop: {
    backgroundColor: "#a8dadc",
    height: 24,
    left: 46,
    top: 0,
    width: 48,
  },
  cloudTwo: {
    opacity: 0.86,
    right: "12%",
    top: "20%",
    transform: [{ scale: 0.84 }],
  },
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
