// app/collection.tsx — MBC Collection Browser
// Layout mirrors index.tsx — same nav, same responsive system, same card style

import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, CONTRACT, PASSPHRASE, RPC_URL } from "../lib/theme";

// ── Same responsive hook as index.tsx ─────────────────────────
const useClientLayout = () => {
  const [layout, setLayout] = useState({
    w: 375,
    h: 812,
    isPhone: true,
    isTablet: false,
    isWeb: false,
  });

  useEffect(() => {
    const update = () => {
      const d = Dimensions.get("window");
      setLayout({
        w: d.width,
        h: d.height,
        isPhone: d.width < 480,
        isTablet: d.width >= 480 && d.width < 900,
        isWeb: Platform.OS === "web" && d.width >= 900,
      });
    };

    update();
    const sub = Dimensions.addEventListener("change", update);
    return () => sub?.remove();
  }, []);

  return layout;
};

// ── Stellar direct reads ───────────────────────────────────────
async function callContract(fn: string, args: any[] = []): Promise<any> {
  const Sdk = await import("@stellar/stellar-sdk" as any);

  const server = new Sdk.rpc.Server(RPC_URL);
  const contract = new Sdk.Contract(CONTRACT);

  const keypair = Sdk.Keypair.random();
  const account = new Sdk.Account(keypair.publicKey(), "0");

  const tx = new Sdk.TransactionBuilder(account, {
    fee: Sdk.BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(fn, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!Sdk.rpc.Api.isSimulationSuccess(sim)) {
    throw new Error("Simulation failed");
  }

  return Sdk.scValToNative(sim.result.retval);
}

// Admin wallet public key — tokens owned by this address are available to buy
// Tokens owned by ANY other address are sold
const ADMIN_WALLET = "GB2GKZ22XFF5BZWRV6AIO7JLCDT7W36Y5DFIUWPENA5IIDEAH7FLXOA3";

// normalize image URLs
function resolveImg(img: string | undefined): string | null {
  if (!img) return null;
  if (img.startsWith("ipfs://")) {
    return img.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return img;
}

// ── Types ─────────────────────────────────────────────────────
interface NFTItem {
  tokenId: number;
  name: string;
  image: string | null;
  price_usdc: number;
  listed: boolean;
  sold: boolean;
  owner: string | null;

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
  authentication: string;

  nfc_chip_id: string;
  collection: string;
  collaboration: string;
  trait_rarity: string;
  design_status: string;
  archive_status: string;
  tailored_year: string;
  design_year: string;
}

type SortKey = "price_asc" | "price_desc" | "newest" | "name_asc";

interface Filters {
  silhouette: string[];
  model: string[];
  edition_type: string[];
  status: string[];
  price: string[];
  primary_color: string[];
  secondary_color: string[];
  primary_texture: string[];
  secondary_texture: string[];
  textured_pattern: string[];
  hardware: string[];
  interior_lining: string[];
  authentication: string[];
  collection: string[];
  collaboration: string[];
  trait_rarity: string[];
  design_status: string[];
  archive_status: string[];
  tailored_year: string[];
  design_year: string[];
}

const emptyFilters: Filters = {
  silhouette: [],
  model: [],
  edition_type: [],
  status: [],
  price: [],
  primary_color: [],
  secondary_color: [],
  primary_texture: [],
  secondary_texture: [],
  textured_pattern: [],
  hardware: [],
  interior_lining: [],
  authentication: [],
  collection: [],
  collaboration: [],
  trait_rarity: [],
  design_status: [],
  archive_status: [],
  tailored_year: [],
  design_year: [],
};

const traitKeys: (keyof Filters)[] = [
  "silhouette",
  "model",
  "edition_type",
  "primary_color",
  "secondary_color",
  "primary_texture",
  "secondary_texture",
  "textured_pattern",
  "hardware",
  "interior_lining",
  "authentication",
  "collection",
  "collaboration",
  "trait_rarity",
  "design_status",
  "archive_status",
  "tailored_year",
  "design_year",
];

// ── Component ─────────────────────────────────────────────────
export default function CollectionScreen() {
  const { isPhone, isWeb } = useClientLayout();

  const [all, setAll] = useState<NFTItem[]>([]);
  const [displayed, setDisplayed] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, listed: 0 });

  // Responsive layout — mirrors index.tsx
  const sidePad = isPhone ? 18 : 24;
  const maxW = isWeb ? 900 : undefined;
  const COLS = isWeb ? 3 : 2;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);

      try {
        const Sdk = await import("@stellar/stellar-sdk" as any);
        const total = Number(await callContract("total_supply"));
        const items: NFTItem[] = [];

        for (let i = 1; i <= total; i++) {
          try {
            const [raw, ownerRaw] = await Promise.all([
              callContract("full_token_data", [
                Sdk.nativeToScVal(i, { type: "u64" }),
              ]),
              callContract("owner_of", [
                Sdk.nativeToScVal(i, { type: "u64" }),
              ]).catch(() => null),
            ]);

            const t = raw?.traits || {};

            const owner = ownerRaw ? String(ownerRaw).trim() : null;
            const ownedByAdmin =
              !owner || owner.toUpperCase() === ADMIN_WALLET.toUpperCase();
            const isSold = !ownedByAdmin;
            const isListed = raw?.listed !== false && ownedByAdmin;

            items.push({
              tokenId: i,
              name: raw?.name || `MBC Token #${i}`,
              image: resolveImg(raw?.image),
              price_usdc: raw?.price_usdc ? Number(raw.price_usdc) : 0,
              listed: isListed,
              sold: isSold,
              owner,

              silhouette: t.silhouette || raw?.silhouette || "",
              model: t.model || raw?.model || "",
              edition_type: t.edition_type || raw?.edition_type || "",

              primary_color: t.primary_color || raw?.primary_color || "",
              secondary_color: t.secondary_color || raw?.secondary_color || "",

              primary_texture: t.primary_texture || raw?.primary_texture || "",
              secondary_texture:
                t.secondary_texture || raw?.secondary_texture || "",
              textured_pattern:
                t.textured_pattern || raw?.textured_pattern || "",

              hardware: t.hardware || raw?.hardware || "",
              interior_lining: t.interior_lining || raw?.interior_lining || "",
              authentication: t.authentication || raw?.authentication || "",

              nfc_chip_id: t.nfc_chip_id || raw?.nfc_chip_id || "",
              collection: t.collection || raw?.collection || "",
              collaboration: t.collaboration || raw?.collaboration || "",
              trait_rarity: t.trait_rarity || raw?.trait_rarity || "",
              design_status: t.design_status || raw?.design_status || "",
              archive_status: t.archive_status || raw?.archive_status || "",
              tailored_year: t.tailored_year || raw?.tailored_year || "",
              design_year: t.design_year || raw?.design_year || "",
            });
          } catch {
            // skip failed tokens
          }
        }

        setAll(items);
        setStats({
          total: items.length,
          listed: items.filter((n) => n.listed && !n.sold).length,
        });
        applyAll(items, filters, sort);
      } catch (e: any) {
        setError(e.message || "Could not connect to Stellar");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, sort],
  );

  useEffect(() => {
    load();
  }, [load]);

  function applyAll(items: NFTItem[], f: Filters, s: SortKey) {
    let r = [...items];

    for (const key of traitKeys) {
      if (f[key].length) {
        r = r.filter((n) => {
          const value = n[key as keyof NFTItem];
          return typeof value === "string" && f[key].includes(value);
        });
      }
    }

    if (f.status.includes("listed") && !f.status.includes("unlisted")) {
      r = r.filter((n) => n.listed === true);
    }

    if (f.status.includes("unlisted") && !f.status.includes("listed")) {
      r = r.filter((n) => n.listed !== true);
    }

    if (f.price.length) {
      r = r.filter((n) => {
        const price = n.price_usdc / 100;

        return f.price.some((bucket) => {
          if (bucket === "under200") return price < 200;
          if (bucket === "200to300") return price >= 200 && price <= 300;
          if (bucket === "300plus") return price > 300;
          return false;
        });
      });
    }

    if (s === "price_asc") r.sort((a, b) => a.price_usdc - b.price_usdc);
    if (s === "price_desc") r.sort((a, b) => b.price_usdc - a.price_usdc);
    if (s === "name_asc") r.sort((a, b) => a.name.localeCompare(b.name));
    if (s === "newest") r.sort((a, b) => b.tokenId - a.tokenId);

    setDisplayed(r);
  }

  function toggleFilter(key: keyof Filters, val: string) {
    const next = filters[key].includes(val)
      ? filters[key].filter((v) => v !== val)
      : [...filters[key], val];

    const f = { ...filters, [key]: next };
    setFilters(f);
    applyAll(all, f, sort);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    applyAll(all, emptyFilters, sort);
  }

  function changeSort(nextSort: SortKey) {
    setSort(nextSort);
    applyAll(all, filters, nextSort);
  }

  function getOptions(key: keyof NFTItem): string[] {
    return [
      ...new Set(all.map((n) => n[key]).filter(Boolean) as string[]),
    ].sort();
  }

  const formatPrice = (p: number) => (p ? `$${(p / 100).toFixed(0)}` : "—");
  const activeCount = Object.values(filters).flat().length;

  const silhouettes = getOptions("silhouette");
  const models = getOptions("model");
  const editions = getOptions("edition_type");
  const primaryColors = getOptions("primary_color");
  const secondaryColors = getOptions("secondary_color");
  const primaryTextures = getOptions("primary_texture");
  const secondaryTextures = getOptions("secondary_texture");
  const texturedPatterns = getOptions("textured_pattern");
  const hardwareOptions = getOptions("hardware");
  const interiorLiningOptions = getOptions("interior_lining");
  const authenticationOptions = getOptions("authentication");
  const collectionOptions = getOptions("collection");
  const collaborationOptions = getOptions("collaboration");
  const rarityOptions = getOptions("trait_rarity");
  const designStatusOptions = getOptions("design_status");
  const archiveStatusOptions = getOptions("archive_status");
  const tailoredYearOptions = getOptions("tailored_year");
  const designYearOptions = getOptions("design_year");

  function renderTraitSection(
    title: string,
    values: string[],
    filterKey: keyof Filters,
  ) {
    if (!values.length) return null;

    return (
      <View style={s.filterSection}>
        <Text style={s.filterSectionLbl}>{title}</Text>
        <View style={s.chips}>
          {values.map((v) => (
            <Chip
              key={`${filterKey}-${v}`}
              label={v}
              active={filters[filterKey].includes(v)}
              onPress={() => toggleFilter(filterKey, v)}
            />
          ))}
        </View>
      </View>
    );
  }

  // ── Card — same aesthetic as home bag cards ────────────────
  function renderCard({ item }: { item: NFTItem }) {
    const init = item.name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() =>
          router.push({ pathname: "/piece/[id]", params: { id: item.tokenId } })
        }
        activeOpacity={0.88}
      >
        <View style={s.cardImg}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <Text style={s.cardInit}>{init}</Text>
          )}

          <View style={s.imgOverlay} />

          <View style={s.tokenBadge}>
            <Text style={s.tokenBadgeTxt}>#{item.tokenId}</Text>
          </View>

          {!item.sold && item.edition_type ? (
            <View style={s.editionBadge}>
              <Text style={s.editionBadgeTxt}>{item.edition_type}</Text>
            </View>
          ) : null}

          {!item.sold ? (
            <View style={s.listedBadge}>
              <Text style={s.listedBadgeTxt}>✦ Listed</Text>
            </View>
          ) : null}

          {item.sold ? (
            <View style={s.soldBadge}>
              <Text style={s.soldBadgeTxt}>Sold · Make Offer</Text>
            </View>
          ) : null}

          {item.nfc_chip_id ? (
            <View style={s.nfcBadge}>
              <Text style={s.nfcBadgeTxt}>✦ NFC</Text>
            </View>
          ) : null}
        </View>

        <View style={s.cardBody}>
          <Text style={s.cardSilhouette} numberOfLines={1}>
            {item.silhouette || "MBC"}
          </Text>
          <Text style={s.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={s.cardSub} numberOfLines={1}>
            {[item.primary_texture, item.hardware]
              .filter(Boolean)
              .join(" · ") || "NFC Embedded"}
          </Text>
        </View>

        <View style={s.cardFoot}>
          <View>
            <Text style={s.cardPrice}>{formatPrice(item.price_usdc)}</Text>
            <Text style={s.cardCurrency}>USDC</Text>
          </View>

          {!item.sold ? (
            <TouchableOpacity
              style={s.buyBtn}
              onPress={() =>
                router.push({
                  pathname: "/piece/[id]",
                  params: { id: item.tokenId },
                })
              }
              activeOpacity={0.8}
            >
              <Text style={s.buyBtnTxt}>Buy Now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.offerBtn}
              onPress={() =>
                router.push({
                  pathname: "/piece/[id]",
                  params: { id: item.tokenId },
                })
              }
              activeOpacity={0.8}
            >
              <Text style={s.offerBtnTxt}>Make Offer</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // ── Filter chip component ──────────────────────────────────
  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {active && <Text style={s.chipCheck}>✓ </Text>}
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.navSafe}>
        <View style={[s.nav, { paddingHorizontal: sidePad }]}>
          <View
            style={[
              s.navInner,
              maxW
                ? {
                    maxWidth: maxW,
                    alignSelf: "center" as const,
                    width: "100%",
                  }
                : {},
            ]}
          >
            <View>
              <Text style={s.navEye}>Michael By Christian</Text>
              <Text style={s.navTitle}>
                The <Text style={s.navTitleEm}>Collection</Text>
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={s.navBack}>← Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!loading && !error && (
          <View style={s.statsBar}>
            {[
              { v: String(stats.total), l: "Total Minted" },
              { v: String(stats.listed), l: "Listed" },
              { v: "Testnet", l: "Network" },
              { v: "Stellar", l: "Blockchain" },
            ].map(({ v, l }) => (
              <View key={l} style={s.statCell}>
                <Text style={s.statVal}>{v}</Text>
                <Text style={s.statLbl}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {!loading && !error && (
          <View style={[s.toolbar, { paddingHorizontal: sidePad }]}>
            <Text style={s.toolCount}>
              <Text style={{ color: C.cream, fontWeight: "600" }}>
                {displayed.length}
              </Text>{" "}
              pieces
            </Text>

            <View style={s.toolRight}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(
                  [
                    ["price_asc", "Price ↑"],
                    ["price_desc", "Price ↓"],
                    ["newest", "Newest"],
                    ["name_asc", "A–Z"],
                  ] as [SortKey, string][]
                ).map(([k, lbl]) => (
                  <TouchableOpacity
                    key={k}
                    style={[s.sortBtn, sort === k && s.sortBtnOn]}
                    onPress={() => changeSort(k)}
                  >
                    <Text style={[s.sortBtnTxt, sort === k && s.sortBtnTxtOn]}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[s.filterBtn, activeCount > 0 && s.filterBtnOn]}
                onPress={() => setFilterOpen(true)}
              >
                <Text
                  style={[
                    s.filterBtnTxt,
                    activeCount > 0 && { color: C.black },
                  ]}
                >
                  Filter{activeCount > 0 ? ` (${activeCount})` : ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>

      {loading && (
        <View style={s.center}>
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={s.loadTxt}>Loading from Stellar...</Text>
          <Text style={s.loadSub}>Reading on-chain contract data</Text>
        </View>
      )}

      {!!error && (
        <View style={s.center}>
          <Text style={s.errTitle}>Could not load collection</Text>
          <Text style={s.errSub}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && displayed.length === 0 && (
        <View style={s.center}>
          <Text style={s.errTitle}>
            {all.length === 0
              ? "No pieces minted yet"
              : "No pieces match filters"}
          </Text>
          {activeCount > 0 && (
            <TouchableOpacity style={s.retryBtn} onPress={clearFilters}>
              <Text style={s.retryTxt}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!loading && !error && displayed.length > 0 && (
        <FlatList
          data={displayed}
          renderItem={renderCard}
          keyExtractor={(item) => String(item.tokenId)}
          numColumns={COLS}
          key={`cols-${COLS}`}
          contentContainerStyle={[
            s.grid,
            maxW
              ? {
                  maxWidth: maxW,
                  alignSelf: "center" as const,
                  width: "100%",
                  paddingHorizontal: 0,
                }
              : {},
          ]}
          columnWrapperStyle={s.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={C.gold}
            />
          }
          ListFooterComponent={<View style={{ height: 48 }} />}
        />
      )}

      <Modal
        visible={filterOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={s.filterModal}>
          <View style={s.filterHandle} />

          <SafeAreaView edges={["top"]}>
            <View style={s.filterHead}>
              <Text style={s.filterTitle}>Filter Pieces</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={s.filterDone}>Done</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <ScrollView showsVerticalScrollIndicator={false}>
            {renderTraitSection("Silhouette", silhouettes, "silhouette")}
            {renderTraitSection("Model", models, "model")}
            {renderTraitSection("Edition Type", editions, "edition_type")}

            <View style={s.filterSection}>
              <Text style={s.filterSectionLbl}>Status</Text>
              <View style={s.chips}>
                <Chip
                  label="Listed for Sale"
                  active={filters.status.includes("listed")}
                  onPress={() => toggleFilter("status", "listed")}
                />
                <Chip
                  label="Not Listed"
                  active={filters.status.includes("unlisted")}
                  onPress={() => toggleFilter("status", "unlisted")}
                />
              </View>
            </View>

            <View style={s.filterSection}>
              <Text style={s.filterSectionLbl}>Price Range</Text>
              <View style={s.chips}>
                <Chip
                  label="Under $200"
                  active={filters.price.includes("under200")}
                  onPress={() => toggleFilter("price", "under200")}
                />
                <Chip
                  label="$200 – $300"
                  active={filters.price.includes("200to300")}
                  onPress={() => toggleFilter("price", "200to300")}
                />
                <Chip
                  label="$300+"
                  active={filters.price.includes("300plus")}
                  onPress={() => toggleFilter("price", "300plus")}
                />
              </View>
            </View>

            {renderTraitSection(
              "Primary Color",
              primaryColors,
              "primary_color",
            )}
            {renderTraitSection(
              "Secondary Color",
              secondaryColors,
              "secondary_color",
            )}
            {renderTraitSection(
              "Primary Texture",
              primaryTextures,
              "primary_texture",
            )}
            {renderTraitSection(
              "Secondary Texture",
              secondaryTextures,
              "secondary_texture",
            )}
            {renderTraitSection(
              "Textured Pattern",
              texturedPatterns,
              "textured_pattern",
            )}
            {renderTraitSection("Hardware", hardwareOptions, "hardware")}
            {renderTraitSection(
              "Interior Lining",
              interiorLiningOptions,
              "interior_lining",
            )}
            {renderTraitSection(
              "Authentication",
              authenticationOptions,
              "authentication",
            )}
            {renderTraitSection("Collection", collectionOptions, "collection")}
            {renderTraitSection(
              "Collaboration",
              collaborationOptions,
              "collaboration",
            )}
            {renderTraitSection("Trait Rarity", rarityOptions, "trait_rarity")}
            {renderTraitSection(
              "Design Status",
              designStatusOptions,
              "design_status",
            )}
            {renderTraitSection(
              "Archive Status",
              archiveStatusOptions,
              "archive_status",
            )}
            {renderTraitSection(
              "Tailored Year",
              tailoredYearOptions,
              "tailored_year",
            )}
            {renderTraitSection(
              "Design Year",
              designYearOptions,
              "design_year",
            )}

            {activeCount > 0 && (
              <TouchableOpacity
                style={s.clearBtn}
                onPress={() => {
                  clearFilters();
                  setFilterOpen(false);
                }}
              >
                <Text style={s.clearBtnTxt}>✕ Clear All Filters</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles — mirrors index.tsx conventions exactly ────────────
const GAP = 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.black },

  navSafe: {
    backgroundColor: C.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  nav: { paddingVertical: 14 },
  navInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navEye: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 2,
  },
  navTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "900",
    color: C.cream,
  },
  navTitleEm: { fontStyle: "italic", fontWeight: "400", color: C.goldLt },
  navBack: { fontSize: 11, color: C.muted, letterSpacing: 0.5 },

  statsBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  statVal: {
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
    color: C.cream,
  },
  statLbl: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 2,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  toolCount: { fontSize: 11, color: C.muted },
  toolRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 4,
  },
  sortBtnOn: { backgroundColor: C.charcoal, borderColor: C.gold },
  sortBtnTxt: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  sortBtnTxtOn: { color: C.gold },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterBtnOn: { backgroundColor: C.gold, borderColor: C.gold },
  filterBtnTxt: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadTxt: {
    marginTop: 16,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.muted,
  },
  loadSub: { marginTop: 6, fontSize: 11, color: "rgba(122,112,96,0.5)" },
  errTitle: {
    fontSize: 16,
    color: C.cream,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errSub: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
  },

  grid: { padding: GAP, paddingBottom: 32 },
  row: { gap: GAP, marginBottom: GAP },

  card: {
    flex: 1,
    backgroundColor: C.charcoal,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardImg: {
    aspectRatio: 1,
    backgroundColor: C.warm,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12,11,9,0.08)",
  },
  cardInit: {
    fontFamily: "serif",
    fontSize: 48,
    fontWeight: "900",
    color: "rgba(184,150,62,0.1)",
  },

  tokenBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(12,11,9,0.88)",
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tokenBadgeTxt: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.gold,
  },
  editionBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(12,11,9,0.85)",
    borderWidth: 1,
    borderColor: C.borderBright,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  editionBadgeTxt: {
    fontSize: 6,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.goldLt,
  },
  listedBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(91,175,133,0.2)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.55)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  listedBadgeTxt: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.green,
    fontWeight: "600",
  },
  soldBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(192,97,74,0.15)",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.45)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  soldBadgeTxt: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.red,
    fontWeight: "600",
  },
  nfcBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(91,175,133,0.15)",
    borderWidth: 1,
    borderColor: "rgba(91,175,133,0.4)",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nfcBadgeTxt: {
    fontSize: 7,
    letterSpacing: 1,
    color: C.green,
    fontWeight: "600",
  },

  cardBody: { padding: 10 },
  cardSilhouette: {
    fontSize: 7,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 3,
  },
  cardName: {
    fontFamily: "serif",
    fontSize: 13,
    fontWeight: "700",
    color: C.cream,
    lineHeight: 17,
    marginBottom: 3,
  },
  cardSub: { fontSize: 9, color: C.muted, letterSpacing: 0.5 },

  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.warm,
  },
  cardPrice: {
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
    color: C.goldLt,
  },
  cardCurrency: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 1,
  },
  buyBtn: {
    backgroundColor: C.black,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buyBtnTxt: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.cream,
  },
  offerBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  offerBtnTxt: {
    fontSize: 7,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.red,
  },

  filterModal: { flex: 1, backgroundColor: C.black },
  filterHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  filterHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterTitle: {
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "900",
    color: C.cream,
  },
  filterDone: {
    fontSize: 12,
    fontWeight: "600",
    color: C.gold,
    letterSpacing: 1,
  },
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterSectionLbl: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 14,
    fontWeight: "600",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  chipActive: { backgroundColor: C.cream, borderColor: C.cream },
  chipCheck: { fontSize: 10, color: C.black, fontWeight: "700" },
  chipTxt: { fontSize: 11, color: C.muted },
  chipTxtActive: { color: C.black, fontWeight: "600" },
  clearBtn: {
    margin: 20,
    borderWidth: 1,
    borderColor: "rgba(192,97,74,0.4)",
    padding: 14,
    alignItems: "center",
  },
  clearBtnTxt: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.red,
  },
});
