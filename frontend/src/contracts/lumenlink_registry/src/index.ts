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
    contractId: "CBCWLMJPKWECI6F2HGNBEQ3KF4PYXBL5E22UNPHLOSEVHSQRZPUB5R5B",
  }
} as const

export const Errors = {
  1: {message:"NotInitialized"},
  2: {message:"AlreadyInitialized"},
  3: {message:"RequestNotFound"},
  4: {message:"Unauthorized"},
  5: {message:"InvalidAmount"},
  6: {message:"InvalidMemo"},
  7: {message:"InvalidLabel"},
  8: {message:"InvalidDescription"},
  9: {message:"InvalidAssetCode"},
  10: {message:"InvalidExpiry"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "NextId", values: void} | {tag: "Request", values: readonly [u64]};


export interface Request {
  active: boolean;
  amount: i128;
  asset: AssetSpec;
  created_at_ledger: u32;
  description: string;
  expires_at_ledger: Option<u32>;
  id: u64;
  label: string;
  memo: Option<string>;
  owner: string;
  recipient: string;
  updated_at_ledger: u32;
}

export type AssetSpec = {tag: "Native", values: void} | {tag: "Credit", values: readonly [string, string]};


export interface RequestInput {
  amount: i128;
  asset: AssetSpec;
  description: string;
  expires_at_ledger: Option<u32>;
  label: string;
  memo: Option<string>;
  recipient: string;
}


export interface RequestPatch {
  active: Option<boolean>;
  amount: Option<i128>;
  description: Option<string>;
  expires_at_ledger: Option<Option<u32>>;
  label: Option<string>;
  memo: Option<Option<string>>;
  recipient: Option<string>;
}

export interface Client {
  /**
   * Construct and simulate a version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  version: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_admin: ({admin, new_admin}: {admin: string, new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_request: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Request>>>

  /**
   * Construct and simulate a list_requests transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  list_requests: ({owner, start_after, limit}: {owner: string, start_after: u64, limit: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<Request>>>>

  /**
   * Construct and simulate a create_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_request: ({owner, input}: {owner: string, input: RequestInput}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Request>>>

  /**
   * Construct and simulate a delete_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  delete_request: ({actor, id}: {actor: string, id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Request>>>

  /**
   * Construct and simulate a update_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_request: ({actor, id, patch}: {actor: string, id: u64, patch: RequestPatch}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Request>>>

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
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACgAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAEAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAgAAAAAAAAAPUmVxdWVzdE5vdEZvdW5kAAAAAAMAAAAAAAAADFVuYXV0aG9yaXplZAAAAAQAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAFAAAAAAAAAAtJbnZhbGlkTWVtbwAAAAAGAAAAAAAAAAxJbnZhbGlkTGFiZWwAAAAHAAAAAAAAABJJbnZhbGlkRGVzY3JpcHRpb24AAAAAAAgAAAAAAAAAEEludmFsaWRBc3NldENvZGUAAAAJAAAAAAAAAA1JbnZhbGlkRXhwaXJ5AAAAAAAACg==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAGTmV4dElkAAAAAAABAAAAAAAAAAdSZXF1ZXN0AAAAAAEAAAAG",
        "AAAAAQAAAAAAAAAAAAAAB1JlcXVlc3QAAAAADAAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABWFzc2V0AAAAAAAH0AAAAAlBc3NldFNwZWMAAAAAAAAAAAAAEWNyZWF0ZWRfYXRfbGVkZ2VyAAAAAAAABAAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAARZXhwaXJlc19hdF9sZWRnZXIAAAAAAAPoAAAABAAAAAAAAAACaWQAAAAAAAYAAAAAAAAABWxhYmVsAAAAAAAAEAAAAAAAAAAEbWVtbwAAA+gAAAAQAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAAAAAAAEXVwZGF0ZWRfYXRfbGVkZ2VyAAAAAAAABA==",
        "AAAAAAAAAAAAAAAHdmVyc2lvbgAAAAAAAAAAAQAAAAQ=",
        "AAAAAgAAAAAAAAAAAAAACUFzc2V0U3BlYwAAAAAAAAIAAAAAAAAAAAAAAAZOYXRpdmUAAAAAAAEAAAAAAAAABkNyZWRpdAAAAAAAAgAAABAAAAAT",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAAJc2V0X2FkbWluAAAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAluZXdfYWRtaW4AAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAQAAAAAAAAAAAAAADFJlcXVlc3RJbnB1dAAAAAcAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAFYXNzZXQAAAAAAAfQAAAACUFzc2V0U3BlYwAAAAAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAARZXhwaXJlc19hdF9sZWRnZXIAAAAAAAPoAAAABAAAAAAAAAAFbGFiZWwAAAAAAAAQAAAAAAAAAARtZW1vAAAD6AAAABAAAAAAAAAACXJlY2lwaWVudAAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAADFJlcXVlc3RQYXRjaAAAAAcAAAAAAAAABmFjdGl2ZQAAAAAD6AAAAAEAAAAAAAAABmFtb3VudAAAAAAD6AAAAAsAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAA+gAAAAQAAAAAAAAABFleHBpcmVzX2F0X2xlZGdlcgAAAAAAA+gAAAPoAAAABAAAAAAAAAAFbGFiZWwAAAAAAAPoAAAAEAAAAAAAAAAEbWVtbwAAA+gAAAPoAAAAEAAAAAAAAAAJcmVjaXBpZW50AAAAAAAD6AAAABM=",
        "AAAAAAAAAAAAAAALZ2V0X3JlcXVlc3QAAAAAAQAAAAAAAAACaWQAAAAAAAYAAAABAAAD6QAAB9AAAAAHUmVxdWVzdAAAAAAD",
        "AAAAAAAAAAAAAAANbGlzdF9yZXF1ZXN0cwAAAAAAAAMAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAALc3RhcnRfYWZ0ZXIAAAAABgAAAAAAAAAFbGltaXQAAAAAAAAEAAAAAQAAA+kAAAPqAAAH0AAAAAdSZXF1ZXN0AAAAAAM=",
        "AAAAAAAAAAAAAAAOY3JlYXRlX3JlcXVlc3QAAAAAAAIAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAFaW5wdXQAAAAAAAfQAAAADFJlcXVlc3RJbnB1dAAAAAEAAAPpAAAH0AAAAAdSZXF1ZXN0AAAAAAM=",
        "AAAAAAAAAAAAAAAOZGVsZXRlX3JlcXVlc3QAAAAAAAIAAAAAAAAABWFjdG9yAAAAAAAAEwAAAAAAAAACaWQAAAAAAAYAAAABAAAD6QAAB9AAAAAHUmVxdWVzdAAAAAAD",
        "AAAAAAAAAAAAAAAOdXBkYXRlX3JlcXVlc3QAAAAAAAMAAAAAAAAABWFjdG9yAAAAAAAAEwAAAAAAAAACaWQAAAAAAAYAAAAAAAAABXBhdGNoAAAAAAAH0AAAAAxSZXF1ZXN0UGF0Y2gAAAABAAAD6QAAB9AAAAAHUmVxdWVzdAAAAAAD" ]),
      options
    )
  }
  public readonly fromJSON = {
    version: this.txFromJSON<u32>,
        get_admin: this.txFromJSON<Result<string>>,
        set_admin: this.txFromJSON<Result<void>>,
        initialize: this.txFromJSON<Result<void>>,
        get_request: this.txFromJSON<Result<Request>>,
        list_requests: this.txFromJSON<Result<Array<Request>>>,
        create_request: this.txFromJSON<Result<Request>>,
        delete_request: this.txFromJSON<Result<Request>>,
        update_request: this.txFromJSON<Result<Request>>
  }
}