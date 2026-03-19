// lib/api.ts — All calls go through the Vercel backend
import { BACKEND } from "./theme";

export interface TokenData {
  name: string;
  image: string;
  price_usdc: number;
  listed: boolean;
  silhouette: string;
  model: string;
  edition_type: string;
  primary_color: string;
  secondary_color: string;
  primary_texture: string;
  secondary_texture: string;
  textured_pattern: string;
  hardware: string;
  interior_lining: string;
  dimensions: string;
  authentication: string;
  serial_number: string;
  nfc_chip_id: string;
  collection: string;
  collaboration: string;
  trait_rarity: string;
  design_status: string;
  archive_status: string;
  tailored_year: number;
  design_year: number;
}

export interface CollectionItem {
  tokenId: number;
  data: TokenData;
}

export interface TokenDetail {
  tokenId: number;
  data: TokenData;
  owner: string | null;
}

export interface CollectionResponse {
  items: CollectionItem[];
  stats: {
    totalMinted: number;
    listedCount: number;
  };
}

export interface CheckoutResult {
  url?: string;
  sessionId?: string;
  error?: string;
  unavailable?: boolean;
}

// GET /api/collection
export async function fetchCollection(): Promise<CollectionResponse> {
  const url = `${BACKEND}/api/collection`;
  console.log("Fetching collection from:", url); // keep this for debugging

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "No response body");
    console.error("Collection fetch failed:", res.status, errorText);
    throw new Error(`Collection fetch failed: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return data as CollectionResponse;
}

// GET /api/token/:id
export async function fetchToken(tokenId: number): Promise<TokenDetail> {
  const res = await fetch(`${BACKEND}/api/token/${tokenId}`);
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  return res.json();
}

// POST /api/create-checkout
export async function createCheckout(
  tokenId: number,
  buyerWallet?: string,
): Promise<CheckoutResult> {
  const res = await fetch(`${BACKEND}/api/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenId,
      buyerWallet: buyerWallet || "",
      successUrl: `${BACKEND}/success.html`,
      cancelUrl: `${BACKEND}/`,
    }),
  });
  return res.json();
}

// GET /api/verify-payment?session_id=xxx
export async function verifyPayment(sessionId: string) {
  const res = await fetch(
    `${BACKEND}/api/verify-payment?session_id=${sessionId}`,
  );
  return res.json();
}

// Helpers
export function imgUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("ipfs://"))
    return raw.replace("ipfs://", "https://ipfs.io/ipfs/");
  return raw;
}

export function formatPrice(price_usdc: number): string {
  if (!price_usdc) return "—";
  return `$${(price_usdc / 100).toFixed(0)}`;
}
