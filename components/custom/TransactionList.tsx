import { SignedPayload } from "@/types/types";
import { getSignedTxList, updateTxStatus } from "@/utils/localTx";
import { settlementSmartContract } from "@/utils/registerSmartContract";
import { Ionicons } from "@expo/vector-icons";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TransactionSettlement from "./TransactionSettlement";

const shortenAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const formatETH = (wei: string) => {
  try {
    return Number(ethers.formatEther(wei)).toFixed(4);
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

  const [selectedTx, setSelectedTx] = useState<SignedPayload | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [isSettling, setIsSettling] = useState(false);

  const handlePressTx = (tx: SignedPayload) => {
    setSelectedTx(tx);
    setModalVisible(true);
    // popup ของคุณ เรียกที่นี่ได้เลย เช่น
    // setModalVisible(true);
  };

  const handleSettle = async (payload: SignedPayload) => {
    try {
      setIsSettling(true); // Start loading

      const result = await settlementSmartContract.settle(payload);

      if (result.alreadySettled) {
        console.log("Tx already settled on-chain");
      }

      await updateTxStatus(payload.uuid, "SUCCESS");
      await loadTxs();
      setModalVisible(false);
    } catch (err: any) {
      const reason = err?.revert?.args?.[0] ?? err?.reason ?? "";
      console.error("Settlement failed:", reason);
      await updateTxStatus(payload.uuid, "FAILED");
      await loadTxs();
      // Optional: Keep modal open so they can see the error,
      // or close it as you are doing now:
      setModalVisible(false);
    } finally {
      setIsSettling(false); // Stop loading regardless of success/fail
    }
  };

  const loadTxs = async () => {
    const data = await getSignedTxList();
    setTxs(data);
  };

  useEffect(() => {
    (async () => {
      await loadTxs();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadTxs();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <TransactionSettlement
        visible={modalVisible}
        payload={selectedTx}
        onClose={() => setModalVisible(false)}
        onSettle={handleSettle}
        settleLoading={isSettling}
      />
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

      {txs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {txs.map((item) => {
            const status = getStatusStyle(item.status);

            return (
              <TouchableOpacity
                key={item.uuid}
                style={styles.card}
                onPress={() => handlePressTx(item)}
                activeOpacity={0.7}
              >
                {/* <View key={item.uuid} style={styles.card}> */}
                {/* Top Row */}
                <View style={styles.topRow}>
                  <Text style={styles.amount}>
                    {formatETH(item.amount)} ETH
                  </Text>

                  <View style={styles.pillRow}>
                    {/* isOwner badge */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: item.isOwner ? "#EFF6FF" : "#F5F3FF",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: item.isOwner ? "#2563EB" : "#7C3AED" },
                        ]}
                      >
                        {item.isOwner ? "Owner" : "Recipient"}
                      </Text>
                    </View>

                    {/* Status badge */}
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: status.bg },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>From</Text>
                  <Text style={styles.value}>{shortenAddress(item.from)}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>To</Text>
                  <Text style={styles.value}>{shortenAddress(item.to)}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Nonce</Text>
                  <Text style={styles.value}>#{item.nonce}</Text>
                </View>
                {/* </View> */}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default TransactionList;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    marginTop: 20,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  list: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  label: {
    fontSize: 12,
    color: "#64748B",
  },

  value: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },

  emptyCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 16,
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
  },

  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
});
