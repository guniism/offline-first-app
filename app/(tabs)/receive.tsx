import { ThemedText } from "@/components/themed-text";
import { WalletService } from "@/utils/wallet";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReceiveScreen() {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [payload, setPayload] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadAddress = async () => {
      const savedAddress = await WalletService.getStoredAddress();
      if (savedAddress) setAddress(savedAddress);
    };
    loadAddress();
  }, []);

  const handleGeneratePayload = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const notSignedPayload = {
      type: "NOT_SIGNED",
      data: {
        receiver: address,
        amount: amount,
        currency: "ETH",
        network: "Sepolia",
        timestamp: Date.now(),
      },
    };

    setPayload(JSON.stringify(notSignedPayload));
    setShowQR(true);
    console.log("SUCCESS! Generated Not Signed Payload:", notSignedPayload);
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.innerContent} onPress={Keyboard.dismiss}>
            <View>
              <ThemedText type="title" style={styles.mainHeading}>
                Receive Funds
              </ThemedText>
              <ThemedText style={styles.subHeading}>
                Set the amount you want to receive offline.
              </ThemedText>

              {/* Input Card */}
              <Pressable
                style={styles.inputCard}
                onPress={() => inputRef.current?.focus()}
              >
                <ThemedText style={styles.inputLabel}>Amount (ETH)</ThemedText>
                <View
                  style={[
                    styles.amountInputContainer,
                    { pointerEvents: "box-none" },
                  ]}
                >
                  <TextInput
                    ref={inputRef}
                    style={styles.amountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(val) => {
                      setAmount(val);
                      setShowQR(false);
                    }}
                    placeholderTextColor="#C7C7CC"
                  />
                  <ThemedText style={styles.ethTicker}>ETH</ThemedText>
                </View>
              </Pressable>
            </View>

            {/* QR Section - จะขยายตัวตามพื้นที่ว่าง */}
            <View style={styles.qrSection}>
              {showQR && payload ? (
                <View style={styles.qrContainer}>
                  <QRCode
                    value={payload}
                    size={180}
                    color="#1C1C1E"
                    backgroundColor="white"
                  />
                  <ThemedText style={styles.qrInstruction}>
                    Show this QR to the sender
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={60} color="#E5E5EA" />
                  <ThemedText style={styles.placeholderText}>
                    Enter amount to generate QR
                  </ThemedText>
                </View>
              )}
            </View>

            {/* ปุ่มกด - จะอยู่ด้านล่างเสมอ */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryBtn, !amount && styles.disabledBtn]}
                onPress={handleGeneratePayload}
                disabled={!amount}
              >
                <ThemedText style={styles.primaryBtnText}>
                  Generate Offline QR
                </ThemedText>
                <Ionicons
                  name="flash"
                  size={18}
                  color="#FFF"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: {
    flexGrow: 1, // สำคัญ: ทำให้ ScrollView ขยายเต็มหน้าจอ
  },
  innerContent: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between", // ดันเนื้อหาออกจากกัน (หัว-กลาง-ปุ่ม)
  },
  mainHeading: { fontSize: 28, fontWeight: "800", color: "#1C1C1E" },
  subHeading: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 4,
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    padding: 20,
    zIndex: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  amountInputContainer: { flexDirection: "row", alignItems: "center" },
  amountInput: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1C1C1E",
    flex: 1,
    paddingVertical: 8,
  },
  ethTicker: { fontSize: 18, fontWeight: "800", color: "#0062FF" },
  qrSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  qrContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  qrInstruction: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
  },
  qrPlaceholder: { alignItems: "center", opacity: 0.5 },
  placeholderText: { marginTop: 10, fontSize: 14, color: "#8E8E93" },
  buttonContainer: {
    marginTop: "auto", // ดันปุ่มไปล่างสุดของพื้นที่
  },
  primaryBtn: {
    backgroundColor: "#0062FF",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: { backgroundColor: "#E5E5EA" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
