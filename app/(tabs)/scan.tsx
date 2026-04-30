import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Ionicons } from "@expo/vector-icons";
import { Wallet } from "ethers";
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
  const [walletData, setWalletData] = useState<{
    address: string;
    balance: string;
  } | null>(null);

  // ฟังก์ชันสแกนจากรูปภาพ (ใช้ Camera.scanFromURLAsync แทน BarCodeScanner)
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "ขออนุญาตเข้าถึงรูปภาพเพื่อใช้งานฟีเจอร์นี้",
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
        // ใช้ Camera ตัวหลักของ expo-camera สแกนจาก URI
        const scannedResults = await Camera.scanFromURLAsync(uri, ["qr"]);

        if (scannedResults.length > 0) {
          handleBarCodeScanned({ data: scannedResults[0].data });
        } else {
          Alert.alert("Not Found", "ไม่พบ QR Code ในรูปภาพที่เลือก");
        }
      } catch (error) {
        console.error("Scan Error:", error);
        Alert.alert(
          "Error",
          "อุปกรณ์รุ่นนี้อาจไม่รองรับการสแกนจากรูปภาพโดยตรง",
        );
      }
    }
  };

  const fetchBalance = async (address: string) => {
    // Note: ควรเปลี่ยน API_KEY เป็นค่าของคุณเองในภายหลัง
    const API_KEY = "MNQGK1HRMJPUNBKAPVQI94KPZW2VXX3IVB";
    const url = `https://api.etherscan.io/v2/api?apikey=${API_KEY}&module=account&chainid=11155111&action=balance&address=${address}&tag=latest`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.status === "1"
        ? (parseFloat(data.result) / 1e18).toFixed(4)
        : "0.0000";
    } catch {
      return "0.0000";
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned && walletData) return;
    setScanned(true);

    try {
      let address = "";
      // ลอง Parse JSON (เผื่อมาจากหน้า Receive)
      try {
        const parsed = JSON.parse(data);
        address = parsed.receiver || "";
      } catch {
        // ถ้าไม่ใช่ JSON ตรวจสอบว่าเป็น Private Key หรือ Address ตรงๆ
        if (data.length === 66 || data.length === 64) {
          address = new Wallet(data).address;
        } else if (data.startsWith("0x") && data.length === 42) {
          address = data;
        }
      }

      if (address) {
        const balance = await fetchBalance(address);
        setWalletData({ address, balance });
      } else {
        Alert.alert(
          "Invalid QR",
          "ข้อมูลใน QR Code ไม่ใช่รูปแบบกระเป๋าเงินที่รองรับ",
        );
        setScanned(false);
      }
    } catch (e) {
      Alert.alert("Error", "ไม่สามารถประมวลผลข้อมูลได้");
      setScanned(false);
    }
  };

  if (!permission) return <ThemedView style={styles.container} />;

  if (!permission.granted) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#8E8E93" />
        <Text style={styles.permissionText}>
          เราต้องขอใช้กล้องเพื่อทำการสแกน
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!walletData ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            style={styles.scanner}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={styles.overlay}>
            <View style={styles.focusedContainer}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <ThemedText style={styles.scanText}>Scan Wallet QR Code</ThemedText>

            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="white" />
              <Text style={styles.uploadBtnText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          <ThemedText type="title" style={{ marginTop: 10 }}>
            Address Found
          </ThemedText>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.addressValue}>{walletData.address}</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Balance</Text>
            <Text style={styles.balanceValue}>
              {walletData.balance} SepoliaETH
            </Text>
          </View>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setScanned(false);
              setWalletData(null);
            }}
          >
            <Text style={styles.retryBtnText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraWrapper: { flex: 1 },
  scanner: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
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
});
