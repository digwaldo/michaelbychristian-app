// app/api/collection/route.ts
import {
    BASE_FEE,
    Contract,
    Keypair,
    nativeToScVal,
    scValToNative,
    TransactionBuilder,
} from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc"; // ← Correct import for Soroban RPC (use * as rpc)

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CACP7SFR7K5MVX4ZRGOTK4WX5NDPQUTFUJTIGU4LJZVDJGILYT2YRDEQ";
const PASSPHRASE = "Test SDF Network ; September 2015";

const server = new rpc.Server(RPC_URL); // ← rpc.Server
const contract = new Contract(CONTRACT_ID);

async function simulateViewCall(fn: string, args: any[] = []) {
  // Dummy keypair and account for simulation (view calls don't sign)
  const dummyKeypair = Keypair.random();

  // Create a minimal account object for TransactionBuilder
  const account = {
    accountId: () => dummyKeypair.publicKey(),
    sequenceNumber: () => "0", // Sequence doesn't matter for simulation
    incrementSequenceNumber: () => {}, // No-op for simulation
  };

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract.call(fn, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${JSON.stringify(sim.error)}`);
  }

  if (!sim.result?.retval) {
    throw new Error("No retval in simulation result");
  }

  return sim.result.retval;
}

export async function GET() {
  try {
    // Get total supply
    const totalScVal = await simulateViewCall("total_supply", []);
    const totalMinted = Number(scValToNative(totalScVal) || 0);

    const items: any[] = [];

    // Load tokens
    for (let i = 1; i <= totalMinted; i++) {
      try {
        const dataScVal = await simulateViewCall("token_data", [
          nativeToScVal(i, { type: "u64" }),
        ]);

        let data = scValToNative(dataScVal);

        if (data?.image?.startsWith("ipfs://")) {
          data.image = data.image.replace("ipfs://", "https://ipfs.io/ipfs/");
        }

        const listed = !!(data?.price_usdc && Number(data.price_usdc) > 0);

        items.push({
          tokenId: i,
          data: {
            ...data,
            listed,
          },
        });
      } catch (err: any) {
        console.error(`Token #${i} failed: ${err.message}`);
        // Continue to next token instead of crashing whole endpoint
      }
    }

    const listedCount = items.filter((item) => item.data.listed).length;

    return Response.json({
      items,
      stats: {
        totalMinted,
        listedCount,
      },
    });
  } catch (error: any) {
    console.error("Collection API error:", error);
    return Response.json(
      { error: error.message || "Failed to load from Stellar testnet" },
      { status: 500 },
    );
  }
}
