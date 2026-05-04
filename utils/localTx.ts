import { SignedPayload } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isWeb } from "./platform";

const TX_LIST = "signed_tx_list";

async function getItem(key: string): Promise<string | null> {
  if (isWeb && typeof window !== "undefined")
    return window.localStorage.getItem(key);
  return await AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string) {
  if (isWeb && typeof window !== "undefined")
    window.localStorage.setItem(key, value);
  else await AsyncStorage.setItem(key, value);
}

async function deleteItem(key: string) {
  if (isWeb && typeof window !== "undefined")
    window.localStorage.removeItem(key);
  else await AsyncStorage.removeItem(key);
}

export async function getSignedTxList(): Promise<SignedPayload[]> {
  const data = await getItem(TX_LIST);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function persistList(list: SignedPayload[]) {
  await setItem(TX_LIST, JSON.stringify(list));
}

export async function saveSignedTx(tx: SignedPayload) {
  const currentList = await getSignedTxList();
  await persistList([tx, ...currentList]);
}

export async function updateTxStatus(uuid: string, status: string) {
  const currentList = await getSignedTxList();
  await persistList(
    currentList.map((tx) => (tx.uuid === uuid ? { ...tx, status } : tx)),
  );
}

export async function deleteSignedTx(uuid: string) {
  const currentList = await getSignedTxList();
  await persistList(currentList.filter((tx) => tx.uuid !== uuid));
}

export async function clearAllSignedTx() {
  await deleteItem(TX_LIST);
}

// import { SignedPayload } from "@/types/types";
// import * as SecureStore from "expo-secure-store";
// import { isWeb, supportsSecureStore } from "./platform";

// // type TxStatus = "PENDING" | "SUCCESS" | "FAILED";
// // // type TxOwner = "OWNER" | "ANOTHER";

// // export type StoredTx = SignedPayload & {
// //   status: TxStatus;
// //   isOwner: boolean;
// // };

// const TX_LIST = "signed_tx_list";

// export async function getSignedTxList(): Promise<SignedPayload[]> {
//   let data: string | null = null;

//   if (supportsSecureStore) {
//     data = await SecureStore.getItemAsync(TX_LIST);
//   } else if (isWeb && typeof window !== "undefined") {
//     data = window.localStorage.getItem(TX_LIST);
//   }

//   if (!data) return [];

//   try {
//     return JSON.parse(data);
//   } catch {
//     return [];
//   }
// }

// async function persistList(list: SignedPayload[]) {
//   const json = JSON.stringify(list);
//   if (supportsSecureStore) {
//     await SecureStore.setItemAsync(TX_LIST, json);
//   } else if (isWeb && typeof window !== "undefined") {
//     window.localStorage.setItem(TX_LIST, json);
//   }
// }

// export async function saveSignedTx(tx: SignedPayload) {
//   const currentList = await getSignedTxList();
//   await persistList([tx, ...currentList]);
// }
