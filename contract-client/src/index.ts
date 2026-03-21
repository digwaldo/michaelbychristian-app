import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CACP7SFR7K5MVX4ZRGOTK4WX5NDPQUTFUJTIGU4LJZVDJGILYT2YRDEQ",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "Name", values: void} | {tag: "Symbol", values: void} | {tag: "TotalSupply", values: void} | {tag: "TokenOwner", values: readonly [u64]} | {tag: "TokenData", values: readonly [u64]} | {tag: "TokenApproval", values: readonly [u64]} | {tag: "OwnerTokens", values: readonly [string]} | {tag: "Initialized", values: void};

export type TraitKey = {tag: "Trait", values: readonly [u64, string]};


export interface TokenData {
  image: string;
  listed: boolean;
  name: string;
  price_usdc: u64;
}

export interface Client {
  /**
   * Construct and simulate a mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  mint: ({to, data}: {to: string, data: TokenData}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a name transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  name: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a symbol transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  symbol: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  approve: ({owner, spender, token_id}: {owner: string, spender: string, token_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a owner_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  owner_of: ({token_id}: {token_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer: ({from, to, token_id}: {from: string, to: string, token_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_trait transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_trait: ({token_id, key}: {token_id: u64, key: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a set_image transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_image: ({token_id, image}: {token_id: u64, image: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_trait transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_trait: ({token_id, key, value}: {token_id: u64, key: string, value: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a tokens_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  tokens_of: ({owner}: {owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a balance_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  balance_of: ({owner}: {owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, name, symbol}: {admin: string, name: string, symbol: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_listed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_listed: ({token_id, listed}: {token_id: u64, listed: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a token_data transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  token_data: ({token_id}: {token_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<TokenData>>

  /**
   * Construct and simulate a get_approved transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_approved: ({token_id}: {token_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a total_supply transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  total_supply: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAEbWludAAAAAIAAAAAAAAAAnRvAAAAAAATAAAAAAAAAARkYXRhAAAH0AAAAAlUb2tlbkRhdGEAAAAAAAABAAAABg==",
        "AAAAAAAAAAAAAAAEbmFtZQAAAAAAAAABAAAAEA==",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAGc3ltYm9sAAAAAAAAAAAAAQAAABA=",
        "AAAAAAAAAAAAAAAHYXBwcm92ZQAAAAADAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAIb3duZXJfb2YAAAABAAAAAAAAAAh0b2tlbl9pZAAAAAYAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAIdHJhbnNmZXIAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAACHRva2VuX2lkAAAABgAAAAA=",
        "AAAAAAAAAAAAAAAJZ2V0X3RyYWl0AAAAAAAAAgAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAAAAAANrZXkAAAAAEQAAAAEAAAPoAAAAEA==",
        "AAAAAAAAAAAAAAAJc2V0X2ltYWdlAAAAAAAAAgAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAAAAAAVpbWFnZQAAAAAAABAAAAAA",
        "AAAAAAAAAAAAAAAJc2V0X3RyYWl0AAAAAAAAAwAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAAAAAANrZXkAAAAAEQAAAAAAAAAFdmFsdWUAAAAAAAAQAAAAAA==",
        "AAAAAAAAAAAAAAAJdG9rZW5zX29mAAAAAAAAAQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAQAAA+oAAAAG",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAETmFtZQAAAAAAAAAAAAAABlN5bWJvbAAAAAAAAAAAAAAAAAALVG90YWxTdXBwbHkAAAAAAQAAAAAAAAAKVG9rZW5Pd25lcgAAAAAAAQAAAAYAAAABAAAAAAAAAAlUb2tlbkRhdGEAAAAAAAABAAAABgAAAAEAAAAAAAAADVRva2VuQXBwcm92YWwAAAAAAAABAAAABgAAAAEAAAAAAAAAC093bmVyVG9rZW5zAAAAAAEAAAATAAAAAAAAAAAAAAALSW5pdGlhbGl6ZWQA",
        "AAAAAAAAAAAAAAAKYmFsYW5jZV9vZgAAAAAAAQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAQAAAAY=",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGc3ltYm9sAAAAAAAQAAAAAA==",
        "AAAAAAAAAAAAAAAKc2V0X2xpc3RlZAAAAAAAAgAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAAAAAAZsaXN0ZWQAAAAAAAEAAAAA",
        "AAAAAAAAAAAAAAAKdG9rZW5fZGF0YQAAAAAAAQAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAQAAB9AAAAAJVG9rZW5EYXRhAAAA",
        "AAAAAgAAAAAAAAAAAAAACFRyYWl0S2V5AAAAAQAAAAEAAAAAAAAABVRyYWl0AAAAAAAAAgAAAAYAAAAR",
        "AAAAAQAAAAAAAAAAAAAACVRva2VuRGF0YQAAAAAAAAQAAAAAAAAABWltYWdlAAAAAAAAEAAAAAAAAAAGbGlzdGVkAAAAAAABAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAKcHJpY2VfdXNkYwAAAAAABg==",
        "AAAAAAAAAAAAAAAMZ2V0X2FwcHJvdmVkAAAAAQAAAAAAAAAIdG9rZW5faWQAAAAGAAAAAQAAA+gAAAAT",
        "AAAAAAAAAAAAAAAMdG90YWxfc3VwcGx5AAAAAAAAAAEAAAAG" ]),
      options
    )
  }
  public readonly fromJSON = {
    mint: this.txFromJSON<u64>,
        name: this.txFromJSON<string>,
        admin: this.txFromJSON<string>,
        symbol: this.txFromJSON<string>,
        approve: this.txFromJSON<null>,
        owner_of: this.txFromJSON<string>,
        transfer: this.txFromJSON<null>,
        get_trait: this.txFromJSON<Option<string>>,
        set_image: this.txFromJSON<null>,
        set_trait: this.txFromJSON<null>,
        tokens_of: this.txFromJSON<Array<u64>>,
        balance_of: this.txFromJSON<u64>,
        initialize: this.txFromJSON<null>,
        set_listed: this.txFromJSON<null>,
        token_data: this.txFromJSON<TokenData>,
        get_approved: this.txFromJSON<Option<string>>,
        total_supply: this.txFromJSON<u64>
  }
}