import { SignedPayload } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { ethers } from "ethers";
import React from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

interface SignedQRModalProps {
  visible: boolean;
  payload: SignedPayload | null;
  onClose: () => void;
  onSettle: (payload: SignedPayload) => Promise<void>;
  settleLoading?: boolean;
}

const shortenAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const formatETH = (wei: string) => {
  try {
    return Number(ethers.formatEther(wei)).toFixed(4);
  } catch {
    return "0.0000";
  }
};

const formatDate = (ts: number) => {
  return new Date(ts * 1000).toLocaleString();
};

const TransactionSettlement: React.FC<SignedQRModalProps> = ({
  visible,
  payload,
  onClose,
  onSettle,
  settleLoading,
}) => {
  if (!payload) return null;

  const qrData = JSON.stringify({ type: "SIGNED", data: payload });

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Transaction Detail</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Role Badge */}
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: payload.isOwner ? "#EFF6FF" : "#F5F3FF" },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: payload.isOwner ? "#2563EB" : "#7C3AED" },
              ]}
            >
              {payload.isOwner ? "You are the Owner" : "You are the Recipient"}
            </Text>
          </View>

          {/* TX Info */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Transaction Info</Text>

            {/* Transaction ID — only if isOwner */}
            {payload.isOwner && (
              <View style={styles.row}>
                <Text style={styles.label}>Transaction ID</Text>
                <Text style={styles.valueSmall}>{payload.uuid}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Amount</Text>
              <Text
                style={styles.value}
              >{`${formatETH(payload.amount)} ETH`}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>From</Text>
              <Text style={styles.value}>{shortenAddress(payload.from)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{shortenAddress(payload.to)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Nonce</Text>
              <Text style={styles.value}>{`#${payload.nonce}`}</Text>
            </View>
            {/* 
            <View style={styles.row}>
              <Text style={styles.label}>Signed At</Text>
              <Text style={styles.value}>{formatDate(payload.signedAt)}</Text>
            </View> */}

            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{payload.status}</Text>
            </View>
          </View>

          {/* QR Code — only if owner */}
          {payload.isOwner && (
            <View style={styles.qrSection}>
              <Text style={styles.sectionTitle}>Scan to Broadcast</Text>
              <Text style={styles.subtitle}>
                {"Let the owner scan this QR to settle on-chain"}
              </Text>
              <View style={styles.qrBox}>
                <QRCode
                  value={qrData}
                  size={220}
                  color="#000"
                  backgroundColor="#fff"
                />
                <Text style={styles.note}>
                  {"Signed payload (r, s, v + nonce)"}
                </Text>
              </View>
            </View>
          )}

          {/* Settlement Button */}
          {/* Settlement Button */}
          <TouchableOpacity
            style={[
              styles.settleButton,
              settleLoading && { backgroundColor: "#94A3B8" }, // เปลี่ยนเป็นสีเทาเมื่อกำลัง Loading
            ]}
            onPress={() => onSettle(payload)}
            activeOpacity={0.8}
            disabled={settleLoading}
          >
            {!settleLoading && (
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#fff"
              />
            )}

            <Text style={styles.settleText}>
              {settleLoading ? "Settling..." : "Settle Transaction"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default TransactionSettlement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 60,
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
  close: {
    fontSize: 17,
    color: "#0062FF",
    fontWeight: "600",
    padding: 8,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    flexShrink: 0,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "right",
  },
  valueSmall: {
    fontSize: 11,
    fontWeight: "500",
    color: "#0F172A",
    textAlign: "right",
    flex: 1,
  },
  qrSection: {
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  qrBox: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F2F2F7",
    alignItems: "center",
    marginTop: 8,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  settleButton: {
    backgroundColor: "#0062FF",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  settleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
