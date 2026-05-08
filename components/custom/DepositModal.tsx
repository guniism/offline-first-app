// DepositModal.tsx
import { registerSmartContract } from "@/utils/registerSmartContract";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: {
    lockedBalance: string;
    receivedBalance: string;
    nonce: string;
  }) => void;
  setBalanceValue: (locked: string, received: string) => Promise<void>;
}

const PRESET_AMOUNTS = ["0.0001", "0.001", "0.01"];

const DepositModal: React.FC<DepositModalProps> = ({
  visible,
  onClose,
  onSuccess,
  setBalanceValue,
}) => {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid ETH amount.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerSmartContract.deposit(amount);
      onSuccess?.(result);
      await setBalanceValue(
        parseFloat(result.lockedBalance).toFixed(4),
        parseFloat(result.receivedBalance).toFixed(4),
      );
      handleClose();
    } catch (error) {
      Alert.alert(
        "Deposit Failed",
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setAmount("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Deposit ETH</Text>
          <TouchableOpacity onPress={handleClose} disabled={isLoading}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.content}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="lock-closed" size={18} color="#0062FF" />
                <Text style={styles.infoTitle}>Secure Collateral</Text>
              </View>
              <Text style={styles.infoDescription}>
                Funds will be locked as collateral to enable offline payments
                and secure your on-chain transactions.
              </Text>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Amount to Deposit</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  editable={!isLoading}
                />
                <View style={styles.inputUnit}>
                  <Text style={styles.unitText}>ETH</Text>
                </View>
              </View>

              {/* Preset Buttons */}
              <View style={styles.presetRow}>
                {PRESET_AMOUNTS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.presetBtn,
                      amount === val && styles.presetBtnActive,
                    ]}
                    onPress={() => setAmount(val)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        amount === val && styles.presetTextActive,
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.row}>
                <Text style={styles.label}>Network</Text>
                <View style={styles.networkBadge}>
                  <View style={styles.networkDot} />
                  <Text style={styles.networkText}>Sepolia Testnet</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Asset</Text>
                <Text style={styles.value}>Ethereum (ETH)</Text>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.depositBtn,
                (!amount || isLoading) && styles.depositBtnDisabled,
              ]}
              onPress={handleDeposit}
              disabled={!amount || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="arrow-up-circle" size={20} color="#FFF" />
                  <Text style={styles.depositBtnText}>
                    Confirm Deposit {amount ? `${amount} ETH` : ""}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default DepositModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeText: {
    fontSize: 17,
    color: "#0062FF",
    fontWeight: "600",
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  infoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
  },
  infoDescription: {
    fontSize: 13,
    color: "#2563EB",
    lineHeight: 18,
  },
  inputSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  inputWrapper: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    height: 56,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  inputUnit: {
    paddingHorizontal: 16,
    height: "100%",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  unitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  presetBtnActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  presetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  presetTextActive: {
    color: "#FFFFFF",
  },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    color: "#64748B",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  networkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  depositBtn: {
    backgroundColor: "#0062FF",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: Platform.OS === "ios" ? 0 : 10,
  },
  depositBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  depositBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
