import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Import จากไฟล์ที่คุณสร้างไว้
import { getBalance, WalletService } from "../../utils/wallet";

import { Link } from "expo-router";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [hasKeypair, setHasKeypair] = useState(false);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0.00 ETH");
  const [isLoading, setIsLoading] = useState(false);

  const fetchCurrentBalance = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    setIsLoading(true);
    try {
      const newBalance = await getBalance(walletAddress);
      const formatted = parseFloat(newBalance).toFixed(4);
      setBalance(`${formatted} ETH`);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const savedAddress = await WalletService.getStoredAddress();
      if (savedAddress) {
        setAddress(savedAddress);
        setHasKeypair(true);
        fetchCurrentBalance(savedAddress);
      }
    };
    init();
  }, [fetchCurrentBalance]);

  const handleGenerateKeypair = async () => {
    try {
      const wallet = await WalletService.generateAndSaveKeypair();
      setAddress(wallet.address);
      setHasKeypair(true);
      fetchCurrentBalance(wallet.address);
      Alert.alert("Security", "New keypair secured in hardware enclave.");
    } catch (error) {
      Alert.alert("Error", "Could not generate secure keypair.");
    }
  };

  const copyToClipboard = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    Alert.alert("Copied", "Address copied to clipboard!");
  };

  const displayAddress = hasKeypair
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "No Address Generated";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.mainHeading}>
            Offline-first Wallet
          </ThemedText>
        </View>

        {/* Wallet Card */}
        <View style={styles.premiumCard}>
          <View style={styles.cardInfo}>
            <View>
              <ThemedText style={styles.networkLabel}>
                Sepolia Test Network
              </ThemedText>

              {hasKeypair ? (
                <View style={styles.balanceRow}>
                  <ThemedText style={styles.balanceText}>{balance}</ThemedText>
                  <TouchableOpacity
                    onPress={() => fetchCurrentBalance(address)}
                    disabled={isLoading}
                    style={styles.refreshCircle}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGenerateKeypair}
                >
                  <Ionicons name="key-outline" size={20} color="#0062FF" />
                  <ThemedText style={styles.generateBtnText}>
                    Generate Keypair
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.addressPill}
              onPress={copyToClipboard}
              disabled={!hasKeypair}
            >
              <ThemedText style={styles.addressValue}>
                {displayAddress}
              </ThemedText>
              {hasKeypair && (
                <Ionicons
                  name="copy-outline"
                  size={14}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ThemedText style={styles.sectionHeader}>Main Services</ThemedText>
        <View style={[styles.servicesGrid, !hasKeypair && { opacity: 0.5 }]}>
          <Link href="/normal-send" asChild>
            <TouchableOpacity>
              <ServiceBtn
                icon="arrow-up"
                label="Send"
                bgColor="#F0F7FF"
                iconColor="#0062FF"
                disabled={false}
              />
            </TouchableOpacity>
          </Link>
          <ServiceBtn
            icon="arrow-down"
            label="Receive"
            bgColor="#F0FFF4"
            iconColor="#34C759"
            disabled={!hasKeypair}
          />

          <ServiceBtn
            icon="grid-outline"
            label="More"
            bgColor="#F8F8F8"
            iconColor="#8E8E93"
            disabled={!hasKeypair}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ServiceBtn = ({ icon, label, bgColor, iconColor, disabled }: any) => (
  <View style={styles.serviceItem}>
    <View style={[styles.serviceIconBox, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={26} color={iconColor} />
    </View>
    <ThemedText style={styles.serviceLabel}>{label}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { padding: 20 },
  header: { flexDirection: "row", marginBottom: 32, marginTop: 8 },
  mainHeading: { fontSize: 28, fontWeight: "800", color: "#1C1C1E" },
  premiumCard: {
    width: "100%",
    height: 180,
    backgroundColor: "#0062FF",
    borderRadius: 28,
    padding: 24,
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: "#0062FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  networkLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40, // Ensures top of text isn't clipped
  },
  refreshCircle: {
    marginLeft: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  generateBtn: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  generateBtnText: {
    color: "#0062FF",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  addressValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 36,
    marginBottom: 16,
  },
  servicesGrid: { flexDirection: "row", justifyContent: "space-between" },
  serviceItem: { alignItems: "center", width: (width - 40) / 4.2 },
  serviceIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceLabel: { fontSize: 13, fontWeight: "600", color: "#3A3A3C" },
  securityDetailCard: {
    backgroundColor: "#F9F9FB",
    borderRadius: 24,
    padding: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  securityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  securityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EBF3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  securityTitle: { fontSize: 15, fontWeight: "700" },
  securityDescription: { fontSize: 13, color: "#636366", lineHeight: 18 },
});
