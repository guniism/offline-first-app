import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { isWeb, supportsSecureStore } from "@/utils/platform";
import { registerSmartContract } from "@/utils/registerSmartContract";
import DepositModal from "./DepositModal";

const NONCE = "user_nonce";

type Props = {
  setBalanceValue: (
    locked: string | null,
    received: string | null,
  ) => Promise<void>;
  lockedBalance: string;
  receivedBalance: string;
  isOnline: boolean | null;
};

const OfflineBalanceCard = ({
  setBalanceValue,
  lockedBalance,
  receivedBalance,
  isOnline,
}: Props) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [depositModalVisible, setDepositModalVisible] = useState(false);

  useEffect(() => {
    checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      let nonce = null;
      if (supportsSecureStore) {
        nonce = await SecureStore.getItemAsync(NONCE);
      } else if (isWeb && typeof window !== "undefined") {
        nonce = window.localStorage.getItem(NONCE);
      }

      setIsRegistered(!!nonce);
    } catch (e) {
      console.error("Failed to fetch nonce", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await registerSmartContract.register();
      setIsRegistered(true);
      Alert.alert("Success", "Smart Contract Registered!");
    } catch (error) {
      console.error(error);

      let message = "Something went wrong";

      if (error instanceof Error) {
        message = error.message;
      }

      Alert.alert("Registration Failed", message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleWithdrawAll = async () => {
    try {
      setWithdrawLoading(true);

      const result = await registerSmartContract.withdrawAll();

      if (result && result.success) {
        Alert.alert(
          "Withdrawal Successful",
          `All funds have been transferred to your wallet.\nCurrent balance: 0 ETH`,
        );
      }
    } catch (error: unknown) {
      console.error("WithdrawAll Handler Error:", error);

      let msg = "An error occurred during withdrawal";

      if (error instanceof Error) {
        msg = (error as any).reason || error.message;
      } else if (typeof error === "string") {
        msg = error;
      }

      Alert.alert("Withdrawal Failed", msg);
    } finally {
      setWithdrawLoading(false);
      setBalanceValue(null, "0.0000");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.registerContainer]}>
        <ActivityIndicator color="#0062FF" />
      </View>
    );
  }

  if (!isRegistered) {
    return (
      <View style={[styles.container, styles.registerContainer]}>
        <View style={styles.registerInfo}>
          <Ionicons
            name="wallet-outline"
            size={32}
            color="#0062FF"
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.registerTitle}>
            Register to manage your offline assets
          </Text>
          {/* <Text style={styles.registerSub}>
            Register to manage your offline assets
          </Text> */}
        </View>

        <TouchableOpacity
          style={[styles.registerButton, isRegistering && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Text style={styles.registerButtonText}>Register Now</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DepositModal
        visible={depositModalVisible}
        onClose={() => setDepositModalVisible(false)}
        onSuccess={(result) => {
          console.log("Deposit success:", result);
        }}
        setBalanceValue={setBalanceValue}
      />
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#E8F1FF" }]}>
            <Ionicons name="arrow-up" size={14} color="#0062FF" />
          </View>
          <Text style={styles.label}>Deposited</Text>
        </View>
        <Text style={styles.amount}>
          {lockedBalance}
          <Text style={styles.unit}>{" ETH"}</Text>
        </Text>
        <Text style={styles.sub}>On-chain Locked</Text>
        {isOnline && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setDepositModalVisible(true)}
          >
            <Text style={styles.buttonText}>Deposit</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: "#E8F1FF" }]}>
            <Ionicons name="arrow-down" size={14} color="#0062FF" />
          </View>
          <Text style={styles.label}>Received</Text>
        </View>
        <Text style={styles.amount}>
          {receivedBalance}
          <Text style={styles.unit}>{" ETH"}</Text>
        </Text>
        <Text style={styles.sub}>Settled Balance</Text>
        {isOnline && (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: "#0062FF" }]}
            onPress={handleWithdrawAll}
            disabled={withdrawLoading}
          >
            <Text style={[styles.buttonText, { color: "#0062FF" }]}>
              {withdrawLoading ? "Processing..." : "Withdraw All"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default OfflineBalanceCard;

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    // alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e4e4e4",
  },
  // --- Register Styles ---
  registerContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    borderStyle: "dashed",
  },
  registerInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  registerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  registerSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: "#0062FF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  registerButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  // --- Original Styles ---
  section: {
    flex: 1,
    paddingHorizontal: 10,
    // borderWidth: 1,
    // height: 150,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  divider: {
    width: 1.5,
    backgroundColor: "#e4e4e4",
    marginHorizontal: 16,
  },
  label: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amount: { color: "#1F2937", fontSize: 22, fontWeight: "800" },
  unit: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
  sub: { color: "#9CA3AF", fontSize: 11, marginTop: 2, marginBottom: 12 },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  buttonText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
});
