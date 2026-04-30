import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  // Hardcoding light theme values for a crisp look,
  // or use Colors.light if your theme file matches the screenshot
  const activeColor = "#007AFF";
  const inactiveColor = "#8E8E93";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 90 : 70,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
          // Sophisticated shadow for Light Mode
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={30} name="house.fill" color={color} />
          ),
        }}
      />

      {/* <Tabs.Screen
        name="scan"
        options={{
          title: "Scan/MyQR", // Empty string to keep the layout balanced
          tabBarIcon: ({ focused }) => (
            <View style={styles.scanButtonContainer}>
              <View
                style={[
                  styles.scanButton,
                  { backgroundColor: focused ? activeColor : inactiveColor },
                ]}
              >
                <IconSymbol size={30} name="qrcode.viewfinder" color="white" />
              </View>
            </View>
          ),
        }}
      /> */}

      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="qrcode.viewfinder" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={30} name="arrow.down.circle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="other"
        options={{
          title: "Other",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={30} name="ellipsis" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButtonContainer: {
    top: -18, // Lifts the button above the bar
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    width: 72,
    height: 72,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    // High-contrast shadow for the button itself
    // shadowColor: "#007AFF",
    // shadowOffset: { width: 0, height: 6 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    elevation: 8,
    borderWidth: 6,
    borderColor: "#FFFFFF",
  },
});
