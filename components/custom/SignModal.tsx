import { SignedPayload } from "@/types/types";
import { saveSignedTx } from "@/utils/localTx";
import { registerSmartContract } from "@/utils/registerSmartContract";
import { signPayload } from "@/utils/signPayload";
import { WalletService } from "@/utils/wallet";
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import SignedQRModal from "./SignedQRModal";

interface SignPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (signedPayload: tempType) => void;
  paymentRequest: PaymentRequest;
}

interface PaymentRequest {
  //   from: string;
  to: string;
  amount: string;
  //   nonce: number;
  //   expiry: number;
}

interface tempType {
  type: string;
  data: SignedPayload;
}

const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const SignPaymentModal: React.FC<SignPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  paymentRequest,
}) => {
  const [isSigning, setIsSigning] = useState(false);
  const [senderAddress, setSenderAddress] = useState<string | null>(null);
  const [localNonce, setLocalNonce] = useState<number | null>(null);

  const [showQR, setShowQR] = useState(false);
  const [signedData, setSignedData] = useState<tempType | null>(null);

  useEffect(() => {
    const fetchSenderAddress = async () => {
      const senderAddress1 = await WalletService.getStoredAddress();
      const localNonce1 = await registerSmartContract.getLocalNonce();
      setSenderAddress(senderAddress1);
      if (localNonce1 !== null) {
        setLocalNonce(localNonce1 + 1);
      }
    };
    fetchSenderAddress();
  }, []);

  const handleSign = async () => {
    setIsSigning(true);
    try {
      // TODO: Replace with actual Secure Enclave signing
      const wallet = await WalletService.getLocalWallet();
      const from = wallet.address;

      const localNonce1 = await registerSmartContract.getLocalNonce();

      const nonceToUse = localNonce1 !== null ? localNonce1 + 1 : 0;

      const { r, s, v } = await signPayload(
        from,
        paymentRequest.to,
        paymentRequest.amount,
        nonceToUse,
      );
      // +1 on local nonce because we want to sign the "next" transaction

      //   const signedPayload: SignedPayload = {
      //     from,
      //     to: paymentRequest.to,
      //     // amount: paymentRequest.amount,
      //     amount: ethers.parseEther(paymentRequest.amount).toString(),
      //     nonce: nonceToUse,
      //     uuid: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      //     signature: { r, s, v },
      //     signedAt: Date.now(),
      //   };

      const SignedPayloadQR = {
        type: "SIGNED",
        data: {
          status: "PENDING",
          isOwner: false,
          from,
          to: paymentRequest.to,
          amount: ethers.parseEther(paymentRequest.amount).toString(),
          nonce: nonceToUse,
          uuid: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          signature: { r, s, v },
          signedAt: Date.now(),
        },
      };

      const SignedPayloadLocal = {
        status: "PENDING",
        isOwner: true,
        from,
        to: paymentRequest.to,
        amount: ethers.parseEther(paymentRequest.amount).toString(),
        nonce: nonceToUse,
        uuid: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        signature: { r, s, v },
        signedAt: Date.now(),
      };

      await saveSignedTx(SignedPayloadLocal);
      await registerSmartContract.saveLocalData(
        nonceToUse.toString(),
        undefined,
      );

      setSignedData(SignedPayloadQR);
      setShowQR(true);

      onSuccess?.(SignedPayloadQR);
      //   onClose();
    } catch (error) {
      Alert.alert(
        "Signing Failed",
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsSigning(false);
    }
  };

  const handleClose = () => {
    if (isSigning) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SignedQRModal
        visible={showQR}
        payload={signedData}
        onClose={() => {
          setShowQR(false);
          onClose(); // close main modal too if you want
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Blue Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSigning}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm payment</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Amount Section (inside blue area) */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>You are sending</Text>
            <Text style={styles.amountValue}>{paymentRequest.amount} ETH</Text>
          </View>

          {/* White Content */}
          <View style={styles.content}>
            {/* Transaction Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Transaction details</Text>

              <View style={styles.row}>
                <Text style={styles.rowKey}>From</Text>
                <Text style={styles.rowVal}>
                  {/* {shortenAddress(paymentRequest.from)} */}
                  {senderAddress ? shortenAddress(senderAddress) : null}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.rowKey}>To</Text>
                <Text style={styles.rowVal}>
                  {shortenAddress(paymentRequest.to)}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.rowKey}>Nonce</Text>
                {/* <Text style={styles.rowVal}>#{paymentRequest.nonce}</Text> */}
                <Text style={styles.rowVal}>
                  {localNonce !== null ? `#${localNonce}` : "Loading..."}
                </Text>
              </View>
            </View>

            {/* Secure Enclave Banner */}
            <View style={styles.enclaveBanner}>
              <View style={styles.enclaveIcon}>
                <Text style={styles.enclaveIconText}>🔒</Text>
              </View>
              <Text style={styles.enclaveText}>
                Signed by Secure Enclave — private key never leaves your device
              </Text>
            </View>

            {/* Spacer */}
            <View style={styles.flex} />

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSigning}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signBtn, isSigning && styles.signBtnDisabled]}
                onPress={handleSign}
                disabled={isSigning}
              >
                {isSigning ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.signText}>Sign</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.broadcastNote}>
              Both you and the receiver can broadcast this transaction
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default SignPaymentModal;

const BLUE = "#0062FF";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLUE,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
    backgroundColor: BLUE,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 24,
    color: "#fff",
    lineHeight: 28,
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  headerSpacer: {
    width: 36,
  },

  // Amount
  amountSection: {
    backgroundColor: BLUE,
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 40,
  },
  amountLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -1,
  },

  // White content area
  content: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    minHeight: 420,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "none",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  rowKey: {
    fontSize: 13,
    color: "#64748b",
  },
  rowVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "monospace",
  },
  divider: {
    height: 0.5,
    backgroundColor: "#e2e8f0",
    marginVertical: 10,
  },

  // Enclave banner
  enclaveBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 0.5,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 24,
  },
  enclaveIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  enclaveIconText: {
    fontSize: 14,
  },
  enclaveText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },

  flex: {
    flex: 1,
    minHeight: 16,
  },

  // Buttons
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94a3b8",
  },
  signBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  signBtnDisabled: {
    backgroundColor: "#93c5fd",
  },
  signText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  broadcastNote: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 16,
  },
});
