import { SignedPayload } from "@/types/types";
import {
  deleteSignedTx,
  getSignedTxList,
  updateTxStatus,
} from "@/utils/localTx"; // Assumed deleteTx exists
import { isWeb, supportsSecureStore } from "@/utils/platform";
import { registerSmartContract } from "@/utils/registerSmartContract";
import { Ionicons } from "@expo/vector-icons";
import { ethers } from "ethers";
import { Link } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const shortenAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const formatETH = (wei: string) => {
  try {
    return Number(ethers.formatEther(wei || "0")).toFixed(4);
  } catch {
    return "0.0000";
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return { bg: "#ECFDF3", text: "#16A34A", label: "Success" };
    case "FAILED":
      return { bg: "#FEF2F2", text: "#DC2626", label: "Failed" };
    default:
      return { bg: "#FFFBEB", text: "#F59E0B", label: "Pending" };
  }
};

const TransactionList = () => {
  const [txs, setTxs] = useState<SignedPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Nonce Editor State
  const [nonceInput, setNonceInput] = useState("");

  // Detail Modal State
  const [selectedTx, setSelectedTx] = useState<SignedPayload | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadTxs = async () => {
    const data = await getSignedTxList();
    setTxs(data);
  };

  const loadLocalNonce = async () => {
    const localNonce = await registerSmartContract.getLocalNonce();
    setNonceInput(localNonce !== null ? localNonce.toString() : "");
  };

  useEffect(() => {
    loadTxs().finally(() => setLoading(false));
    loadLocalNonce();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTxs();
    setRefreshing(false);
    loadLocalNonce();
  };

  // --- Handlers ---

  const handleUpdateNonce = () => {
    if (!nonceInput) return;
    console.log("Updating global/next nonce to:", nonceInput);
    // TODO: Add your logic to save this nonce to local storage or state
    registerSmartContract.saveLocalData(nonceInput, undefined);
    Alert.alert("Success", `Nonce set to ${nonceInput}`);
    // setNonceInput("");
  };

  const handleStatusUpdate = async (
    uuid: string,
    newStatus: "SUCCESS" | "FAILED" | "PENDING",
  ) => {
    await updateTxStatus(uuid, newStatus);
    await loadTxs();
    setModalVisible(false);
  };

  const handleDelete = async (uuid: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to remove this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // await deleteTx(uuid); // Call your utility function
            await deleteSignedTx(uuid);
            setTxs((prev) => prev.filter((t) => t.uuid !== uuid));
            setModalVisible(false);
          },
        },
      ],
    );
  };

  // เพิ่ม handler นี้
  const handleClearNonce = async () => {
    Alert.alert(
      "Clear Nonce",
      "Are you sure you want to delete the stored nonce?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            if (supportsSecureStore) {
              await SecureStore.deleteItemAsync("user_nonce");
            } else if (isWeb && typeof window !== "undefined") {
              window.localStorage.removeItem("user_nonce");
            }
            setNonceInput("");
            Alert.alert("Done", "Nonce cleared");
          },
        },
      ],
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  const handleResetWallet = async () => {
    // First Confirmation
    Alert.alert(
      "Reset Wallet",
      "This will delete your Private Key and Address. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Reset",
          style: "destructive",
          onPress: () => {
            // Second Confirmation (Double Check)
            Alert.alert(
              "FINAL WARNING",
              "This action is permanent. You will lose access to this wallet if you haven't backed up your Private Key!",
              [
                { text: "Stop! Cancel", style: "cancel" },
                {
                  text: "I understand, Delete All",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      if (supportsSecureStore) {
                        await SecureStore.deleteItemAsync("user_private_key");
                        await SecureStore.deleteItemAsync("user_address");
                        await SecureStore.deleteItemAsync("user_nonce");
                      } else if (isWeb) {
                        window.localStorage.removeItem("user_private_key");
                        window.localStorage.removeItem("user_address");
                        window.localStorage.removeItem("user_nonce");
                      }
                      setNonceInput("");
                      setTxs([]);
                      Alert.alert(
                        "Reset Complete",
                        "All wallet data has been wiped.",
                      );
                    } catch (error) {
                      Alert.alert("Error", "Failed to reset wallet storage.");
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 1. NONCE EDITOR */}
      <View style={styles.nonceContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Set Next Nonce (e.g. 5)"
            keyboardType="default"
            value={nonceInput}
            onChangeText={setNonceInput}
          />
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleUpdateNonce}
          >
            <Text style={styles.applyButtonText}>Set Nonce</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.clearNonceBtn} onPress={handleClearNonce}>
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
        <Text style={styles.clearNonceBtnText}>Clear Stored Nonce</Text>
      </TouchableOpacity>

      <Link href="/normal-send" asChild>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
            backgroundColor: "#deebff",
            borderBottomWidth: 1,
            borderBottomColor: "#0062FF",
          }}
        >
          <Text style={{ color: "#0062FF", fontWeight: "600", fontSize: 13 }}>
            Transfer Money
          </Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity
        style={styles.clearNonceBtn}
        onPress={handleResetWallet}
      >
        <Ionicons name="warning-outline" size={16} color="#B91C1C" />
        <Text style={styles.clearNonceBtnText}>Reset Wallet</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator size="small" />
          ) : (
            <Ionicons name="refresh" size={20} color="#0F172A" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      >
        {txs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          txs.map((item) => {
            const status = getStatusStyle(item.status);
            return (
              <TouchableOpacity
                key={item.uuid}
                style={styles.card}
                onPress={() => {
                  setSelectedTx(item);
                  setModalVisible(true);
                }}
              >
                <View style={styles.topRow}>
                  <Text style={styles.amount}>
                    {formatETH(item.amount)} ETH
                  </Text>
                  <View
                    style={[styles.statusPill, { backgroundColor: status.bg }]}
                  >
                    <Text style={[styles.statusText, { color: status.text }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subText}>
                  Nonce: #{item.nonce} • {shortenAddress(item.to)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 2. TRANSACTION DETAIL MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View style={styles.modalBody}>
                <DetailRow label="UUID" value={selectedTx.uuid} />
                <DetailRow label="From" value={selectedTx.from} />
                <DetailRow label="To" value={selectedTx.to} />
                <DetailRow
                  label="Value"
                  value={`${formatETH(selectedTx.amount)} ETH`}
                />
                <DetailRow label="Nonce" value={selectedTx.nonce.toString()} />

                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Actions</Text>
                <View style={styles.actionGrid}>
                  <ActionBtn
                    label="Success"
                    color="#16A34A"
                    onPress={() =>
                      handleStatusUpdate(selectedTx.uuid, "SUCCESS")
                    }
                  />
                  <ActionBtn
                    label="Fail"
                    color="#DC2626"
                    onPress={() =>
                      handleStatusUpdate(selectedTx.uuid, "FAILED")
                    }
                  />
                  <ActionBtn
                    label="Pending"
                    color="#F59E0B"
                    onPress={() =>
                      handleStatusUpdate(selectedTx.uuid, "PENDING")
                    }
                  />
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(selectedTx.uuid)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Sub-components for cleaner UI
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
      {value}
    </Text>
  </View>
);

const ActionBtn = ({ label, color, onPress }: any) => (
  <TouchableOpacity
    style={[styles.actionBtn, { borderColor: color }]}
    onPress={onPress}
  >
    <Text style={{ color, fontWeight: "600", fontSize: 12 }}>{label}</Text>
  </TouchableOpacity>
);

export default TransactionList;

const styles = StyleSheet.create({
  // Nonce Editor
  nonceContainer: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginTop: 50,
  },
  inputWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  applyButton: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },

  // List Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    marginTop: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  amount: { fontSize: 16, fontWeight: "700" },
  subText: { fontSize: 12, color: "#64748B", marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "700" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { gap: 15 },
  detailRow: { gap: 4 },
  label: { fontSize: 12, color: "#64748B" },
  value: { fontSize: 14, fontWeight: "500", color: "#0F172A" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 10 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#475569" },
  actionGrid: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    padding: 12,
  },
  deleteBtnText: { color: "#EF4444", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyCard: { padding: 40, alignItems: "center" },
  emptyText: { color: "#94A3B8" },
  clearNonceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  clearNonceBtnText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 13,
  },
});
