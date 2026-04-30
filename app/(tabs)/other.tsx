import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router"; //
import { StyleSheet, TouchableOpacity, View } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";

// Import your custom ServiceBtn
// Note: If ServiceBtn is defined in HomeScreen, you might need to export it
// or move it to a shared components folder.
const ServiceBtn = ({ icon, label, bgColor, iconColor, disabled }: any) => (
  <View style={styles.serviceItem}>
    <View style={[styles.serviceIconBox, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={26} color={iconColor} />
    </View>
    <ThemedText style={styles.serviceLabel}>{label}</ThemedText>
  </View>
);

export default function OtherScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          Explore
        </ThemedText>
      </ThemedView>

      {/* --- ServiceBtn trigger for Modal --- */}

      <Link href="/normal-send" asChild>
        <TouchableOpacity>
          <ServiceBtn
            icon="key-outline"
            label="Security"
            bgColor="#FFFFFF"
            iconColor="#0062FF"
          />
        </TouchableOpacity>
      </Link>

      <ThemedText>
        This app includes example code to help you get started.
      </ThemedText>

      {/* ... Existing Collapsible components ... */}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  modalTriggerSection: {
    padding: 16,
    backgroundColor: "#F0F7FF", // Light blue background for the section
    borderRadius: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0062FF",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  buttonWrapper: {
    alignItems: "center",
  },
  // ServiceBtn Internal Styles (Copied from HomeScreen for consistency)
  serviceItem: {
    alignItems: "center",
  },
  serviceIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    // Add shadow to make white button pop
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A3A3C",
  },
});
