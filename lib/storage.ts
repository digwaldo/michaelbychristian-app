// lib/storage.ts — persists wallet address across sessions
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mbc_wallet_address';

export async function saveWallet(address: string) {
  await AsyncStorage.setItem(KEY, address);
}

export async function loadWallet(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearWallet() {
  await AsyncStorage.removeItem(KEY);
}
