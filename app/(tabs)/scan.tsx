import SignPaymentModal from "@/components/custom/SignModal";
import { ThemedView } from "@/components/themed-view";
import { TXPayload3 } from "@/types/types";
import { saveSignedTx } from "@/utils/localTx";
import { Ionicons } from "@expo/vector-icons";
import { formatEther } from "ethers";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ต้องใช้ export default เพื่อให้ expo-router หาหน้าเจอ
export default function ScanPage() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  // const [walletData, setWalletData] = useState<{
  //   address: string;
  //   balance: string;
  // } | null>(null);
  const [payloadData, setPayloadData] = useState<TXPayload3 | null>(null);

  // const [testData, setTestData] = useState<string | null>(null);
  // Function to scan QR code from an image (using Camera.scanFromURLAsync instead of BarCodeScanner)
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        // "Permission to access media library is required to use this feature",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      try {
        // Use Expo Camera to scan QR code from image URI
        const scannedResults = await Camera.scanFromURLAsync(uri, ["qr"]);

        if (scannedResults.length > 0) {
          handleBarCodeScanned({ data: scannedResults[0].data });
        } else {
          Alert.alert("Not Found", "No QR code detected in the selected image");
        }
      } catch (error) {
        console.error("Scan Error:", error);
        Alert.alert(
          "Error",
          // "This device may not support scanning QR codes from images",
        );
      }
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // 1. Prevent duplicate processing if a scan is already active
    if (scanned) return;
    setScanned(true);

    try {
      let parsed = null;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        console.warn("QR Data is not valid JSON");
      }

      if (!parsed || !parsed.type) {
        throw new Error("Invalid payload structure");
      }

      // 2. Handle Unsigned Transaction (Draft)
      if (parsed.type === "NOT_SIGNED") {
        setPayloadData({
          type: "NOT_SIGNED",
          data: {
            receiver: parsed.data?.receiver,
            amount: parsed.data?.amount, // Expected in Wei or ETH string
            currency: parsed.data?.currency || "ETH",
            network: parsed.data?.network || "Sepolia",
            timestamp: parsed.data?.timestamp || Date.now(),
          },
        });
      }
      // 3. Handle Signed Transaction (Ready to Broadcast)
      else if (parsed.type === "SIGNED") {
        setPayloadData({
          type: "SIGNED",
          data: {
            status: parsed.data?.status,
            isOwner: parsed.data?.isOwner,
            from: parsed.data?.from,
            to: parsed.data?.to,
            amount: parsed.data?.amount,
            nonce: parsed.data?.nonce,
            uuid: parsed.data?.uuid,
            signature: {
              r: parsed.data?.signature?.r,
              s: parsed.data?.signature?.s,
              v: parsed.data?.signature?.v,
            },
            signedAt: parsed.data?.signedAt,
          },
        });
      } else {
        throw new Error("Unsupported payload type");
      }
    } catch (e) {
      console.error("Scan Error:", e);
      Alert.alert(
        "Scan Failed",
        "The QR code format is invalid or not supported.",
        [{ text: "Try Again", onPress: () => setScanned(false) }],
      );
    }
  };

  if (!permission) return <ThemedView style={styles.container} />;

  if (!permission.granted) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#8E8E93" />
        <Text style={styles.permissionText}>
          Camera access is required to scan QR codes. Please allow camera
          permission to continue.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Ionicons name="image-outline" size={24} color="white" />
          <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
        </TouchableOpacity> */}
      </ThemedView>
    );
  }

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleConfirm = async () => {
    if (!payloadData || payloadData.type !== "SIGNED") return;

    try {
      console.log("Broadcasting TX:", payloadData);

      await saveSignedTx(payloadData.data);

      Alert.alert("Success", "Transaction sent successfully", [
        {
          text: "OK",
          onPress: () => {
            setScanned(false);
            setPayloadData(null);
          },
        },
      ]);
    } catch (err) {
      console.error("Broadcast Error:", err);
      Alert.alert("Error", "Failed to send transaction");
    }
  };

  return (
    <View style={styles.container}>
      {!payloadData ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          zoom={0.1}
        >
          <SafeAreaView style={styles.overlay}>
            <View style={styles.focusedContainer}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Text style={styles.scanText}>Scan Wallet QR Code</Text>

            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="white" />
              <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </CameraView>
      ) : (
        <SafeAreaView style={styles.resultContainer}>
          {payloadData.type === "NOT_SIGNED" ? (
            <SignPaymentModal
              visible={true}
              onClose={() => {
                setScanned(false);
                setPayloadData(null);
              }}
              onSuccess={(signedPayload) => {
                console.log(signedPayload);
              }}
              paymentRequest={{
                // from: "Nah",
                to: payloadData.data.receiver,
                amount: payloadData.data.amount.toString(), // Convert to number if it's a string
                // nonce: 0,
              }}
            />
          ) : payloadData.type === "SIGNED" ? (
            <View style={styles.content}>
              {/* Transaction Details Card */}
              <Text style={styles.cardTitle}>Transaction details</Text>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.rowKey}>From</Text>
                  <Text style={styles.rowVal}>
                    {/* {shortenAddress(paymentRequest.from)} */}
                    {payloadData.data.from
                      ? shortenAddress(payloadData.data.from)
                      : null}
                  </Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.rowKey}>To</Text>
                  <Text style={styles.rowVal}>
                    {payloadData.data.to
                      ? shortenAddress(payloadData.data.to)
                      : null}
                  </Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.rowKey}>Amount</Text>
                  {/* <Text style={styles.rowVal}>#{paymentRequest.nonce}</Text> */}
                  <Text style={styles.rowVal}>
                    {payloadData.data.amount !== null
                      ? `${formatEther(payloadData.data.amount)} ETH`
                      : "Loading..."}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.rowKey}>Nonce</Text>
                  {/* <Text style={styles.rowVal}>#{paymentRequest.nonce}</Text> */}
                  <Text style={styles.rowVal}>
                    {payloadData.data.nonce !== null
                      ? `#${payloadData.data.nonce}`
                      : "Loading..."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  focusedContainer: { width: 220, height: 220, position: "relative" },
  scanText: { marginTop: 40, fontSize: 16, color: "#fff", fontWeight: "600" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 50,
  },
  uploadBtnText: { color: "white", marginLeft: 10, fontWeight: "600" },
  resultContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#fff",
  },
  infoBox: {
    width: "100%",
    padding: 20,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    marginVertical: 30,
  },
  label: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "bold",
    marginBottom: 5,
  },
  addressValue: {
    fontSize: 14,
    color: "#000",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 15 },
  balanceValue: { fontSize: 24, fontWeight: "bold", color: "#007AFF" },
  retryBtn: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
  },
  retryBtnText: { color: "#fff", fontWeight: "bold" },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  permissionText: { marginVertical: 20, color: "#8E8E93" },
  permissionBtn: { backgroundColor: "#007AFF", padding: 15, borderRadius: 10 },
  permissionBtnText: { color: "#fff", fontWeight: "bold" },
  // กรอบสแกน
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: "#007AFF",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: "#007AFF",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#007AFF",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#007AFF",
  },

  content: {
    width: "100%",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#00000",
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

  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",

    // shadow (iOS)
    // shadowColor: "#000000",
    // shadowOffset: { width: 0, height: 6 },
    // shadowOpacity: 0.3,
    // shadowRadius: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
