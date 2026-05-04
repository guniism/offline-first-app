import { TXPayload2 } from "@/types/types";
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
  payload: TXPayload2 | null;
  onClose: () => void;
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

const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString();

const SignedQRModal: React.FC<SignedQRModalProps> = ({
  visible,
  payload,
  onClose,
}) => {
  if (!payload) return null;

  const qrData = JSON.stringify(payload);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{"Signed Transaction"}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>{"Close"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {"Let receiver scan this QR to broadcast"}
          </Text>

          {/* QR Card — same style as TransactionSettlement qrBox */}
          <View style={styles.qrSection}>
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

          {/* Transaction Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{"Transaction Info"}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{"Amount"}</Text>
              <Text
                style={styles.value}
              >{`${formatETH(payload.data.amount)} ETH`}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{"From"}</Text>
              <Text style={styles.value}>
                {shortenAddress(payload.data.from)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{"To"}</Text>
              <Text style={styles.value}>
                {shortenAddress(payload.data.to)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{"Nonce"}</Text>
              <Text style={styles.value}>{`#${payload.data.nonce}`}</Text>
            </View>

            {/* <View style={styles.row}>
              <Text style={styles.label}>{"Signed At"}</Text>
              <Text style={styles.value}>
                {formatDate(payload.data.signedAt)}
              </Text>
            </View> */}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default SignedQRModal;

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
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  qrSection: {
    alignItems: "center",
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
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
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
});
