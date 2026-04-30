import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet, // ใช้ View ปกติแทน ThemedView
  Text,
  TextInput,
  TouchableOpacity,
  View, // ใช้ View ปกติแทน ThemedView
} from "react-native";

import { WalletService } from "@/utils/wallet";

export default function TransferModal() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!address || !amount) {
      Alert.alert(
        "Missing Info",
        "Please enter both recipient address and amount.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await WalletService.sendTransaction(address, amount);
      if (result.success && result.hash) {
        Alert.alert(
          "Transaction Sent",
          `Your transfer is being processed.\n\nHash: ${result.hash.slice(0, 15)}...`,
          [{ text: "Done", onPress: () => router.back() }],
        );
      } else {
        Alert.alert(
          "Transfer Failed",
          result.error || "Please check your balance.",
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }} // บังคับพื้นหลังขาว
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Transfer ETH</Text>
            <Text style={styles.subtitle}>
              Send Sepolia testnet tokens securely
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Address</Text>
              <TextInput
                style={styles.input}
                placeholder="0x..."
                placeholderTextColor="#A1A1A1"
                value={address}
                onChangeText={setAddress}
                autoCapitalize="none"
                spellCheck={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (ETH)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#A1A1A1"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleTransfer}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Now</Text>
              )}
            </TouchableOpacity>

            <Link href="/" dismissTo style={styles.link}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFFFFF", // บังคับพื้นหลังขาว
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    color: "#1C1C1E", // สีตัวอักษรเข้ม
  },
  subtitle: {
    fontSize: 16,
    color: "#636366", // สีตัวอักษรจาง
    textAlign: "center",
  },
  card: {
    backgroundColor: "#F2F2F7", // สีเทาอ่อนแบบ iOS Light mode
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#8E8E93",
  },
  input: {
    height: 54,
    backgroundColor: "#FFFFFF", // พื้นหลัง Input ขาว
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000", // ตัวหนังสือที่พิมพ์เป็นสีดำ
    borderWidth: 1,
    borderColor: "#D1D1D6",
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    width: "100%",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#C7C7CC",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    marginTop: 20,
  },
  cancelText: {
    fontSize: 16,
    color: "#FF3B30", // สีแดงสำหรับปุ่มยกเลิก
    fontWeight: "600",
  },
});
