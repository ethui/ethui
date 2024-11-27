use alloy::dyn_abi::TypedData;
use alloy::eips::BlockId;
use alloy::eips::BlockNumberOrTag;
use alloy::network::Ethereum;
use alloy::network::Network;
use alloy::primitives::Bytes;
use alloy::primitives::B64;
use alloy::primitives::U64;
use alloy::rpc::types::serde_helpers::JsonStorageKey;
use alloy::rpc::types::simulate::SimulatePayload;
use alloy::rpc::types::simulate::SimulatedBlock;
use alloy::rpc::types::state::StateOverride;
use alloy::rpc::types::AccessListResult;
use alloy::rpc::types::BlockOverrides;
use alloy::rpc::types::Bundle;
use alloy::rpc::types::EIP1186AccountProofResponse;
use alloy::rpc::types::EthCallResponse;
use alloy::rpc::types::FeeHistory;
use alloy::rpc::types::Header;
use alloy::rpc::types::Index;
use alloy::rpc::types::StateContext;
use alloy::rpc::types::Work;
use alloy::rpc::types::{SyncStatus, TransactionRequest};
use ethui_types::Address;
use ethui_types::B256;
use ethui_types::U256;
use jsonrpsee::core::{async_trait, RpcResult};
use jsonrpsee::proc_macros::rpc;
use jsonrpsee::types::ErrorObject;

#[rpc(server, namespace = "eth")]
pub trait EthApi {
    /// Returns the protocol version encoded as a string.
    #[method(name = "protocolVersion")]
    async fn protocol_version(&self) -> RpcResult<U64>;

    /// Returns an object with data about the sync status or false.
    #[method(name = "syncing")]
    fn syncing(&self) -> RpcResult<SyncStatus>;

    /// Returns the client coinbase address.
    #[method(name = "coinbase")]
    async fn author(&self) -> RpcResult<Address>;

    /// Returns a list of addresses owned by client.
    #[method(name = "accounts")]
    fn accounts(&self) -> RpcResult<Vec<Address>>;

    /// Returns the number of most recent block.
    #[method(name = "blockNumber")]
    fn block_number(&self) -> RpcResult<U256>;

    /// Returns the chain ID of the current network.
    #[method(name = "chainId")]
    async fn chain_id(&self) -> RpcResult<Option<U64>>;

    /// Returns information about a block by hash.
    #[method(name = "getBlockByHash")]
    async fn block_by_hash(
        &self,
        hash: B256,
        full: bool,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>>;

    /// Returns information about a block by number.
    #[method(name = "getBlockByNumber")]
    async fn block_by_number(
        &self,
        number: BlockNumberOrTag,
        full: bool,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>>;

    /// Returns the number of transactions in a block from a block matching the given block hash.
    #[method(name = "getBlockTransactionCountByHash")]
    async fn block_transaction_count_by_hash(&self, hash: B256) -> RpcResult<Option<U256>>;

    /// Returns the number of transactions in a block matching the given block number.
    #[method(name = "getBlockTransactionCountByNumber")]
    async fn block_transaction_count_by_number(
        &self,
        number: BlockNumberOrTag,
    ) -> RpcResult<Option<U256>>;

    /// Returns the number of uncles in a block from a block matching the given block hash.
    #[method(name = "getUncleCountByBlockHash")]
    async fn block_uncles_count_by_hash(&self, hash: B256) -> RpcResult<Option<U256>>;

    /// Returns the number of uncles in a block with given block number.
    #[method(name = "getUncleCountByBlockNumber")]
    async fn block_uncles_count_by_number(
        &self,
        number: BlockNumberOrTag,
    ) -> RpcResult<Option<U256>>;

    /// Returns all transaction receipts for a given block.
    #[method(name = "getBlockReceipts")]
    async fn block_receipts(
        &self,
        block_id: BlockId,
    ) -> RpcResult<Option<Vec<<Ethereum as Network>::ReceiptResponse>>>;

    /// Returns an uncle block of the given block and index.
    #[method(name = "getUncleByBlockHashAndIndex")]
    async fn uncle_by_block_hash_and_index(
        &self,
        hash: B256,
        index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>>;

    /// Returns an uncle block of the given block and index.
    #[method(name = "getUncleByBlockNumberAndIndex")]
    async fn uncle_by_block_number_and_index(
        &self,
        number: BlockNumberOrTag,
        index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>>;

    /// Returns the EIP-2718 encoded transaction if it exists.
    ///
    /// If this is a EIP-4844 transaction that is in the pool it will include the sidecar.
    #[method(name = "getRawTransactionByHash")]
    async fn raw_transaction_by_hash(&self, hash: B256) -> RpcResult<Option<Bytes>>;

    /// Returns the information about a transaction requested by transaction hash.
    #[method(name = "getTransactionByHash")]
    async fn transaction_by_hash(
        &self,
        hash: B256,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>>;

    /// Returns information about a raw transaction by block hash and transaction index position.
    #[method(name = "getRawTransactionByBlockHashAndIndex")]
    async fn raw_transaction_by_block_hash_and_index(
        &self,
        hash: B256,
        index: Index,
    ) -> RpcResult<Option<Bytes>>;

    /// Returns information about a transaction by block hash and transaction index position.
    #[method(name = "getTransactionByBlockHashAndIndex")]
    async fn transaction_by_block_hash_and_index(
        &self,
        hash: B256,
        index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>>;

    /// Returns information about a raw transaction by block number and transaction index
    /// position.
    #[method(name = "getRawTransactionByBlockNumberAndIndex")]
    async fn raw_transaction_by_block_number_and_index(
        &self,
        number: BlockNumberOrTag,
        index: Index,
    ) -> RpcResult<Option<Bytes>>;

    /// Returns information about a transaction by block number and transaction index position.
    #[method(name = "getTransactionByBlockNumberAndIndex")]
    async fn transaction_by_block_number_and_index(
        &self,
        number: BlockNumberOrTag,
        index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>>;

    /// Returns information about a transaction by sender and nonce.
    #[method(name = "getTransactionBySenderAndNonce")]
    async fn transaction_by_sender_and_nonce(
        &self,
        address: Address,
        nonce: U64,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>>;

    /// Returns the receipt of a transaction by transaction hash.
    #[method(name = "getTransactionReceipt")]
    async fn transaction_receipt(
        &self,
        hash: B256,
    ) -> RpcResult<Option<<Ethereum as Network>::ReceiptResponse>>;

    /// Returns the balance of the account of given address.
    #[method(name = "getBalance")]
    async fn balance(&self, address: Address, block_number: Option<BlockId>) -> RpcResult<U256>;

    /// Returns the value from a storage position at a given address
    #[method(name = "getStorageAt")]
    async fn storage_at(
        &self,
        address: Address,
        index: JsonStorageKey,
        block_number: Option<BlockId>,
    ) -> RpcResult<B256>;

    /// Returns the number of transactions sent from an address at given block number.
    #[method(name = "getTransactionCount")]
    async fn transaction_count(
        &self,
        address: Address,
        block_number: Option<BlockId>,
    ) -> RpcResult<U256>;

    /// Returns code at a given address at given block number.
    #[method(name = "getCode")]
    async fn get_code(&self, address: Address, block_number: Option<BlockId>) -> RpcResult<Bytes>;

    /// Returns the block's header at given number.
    #[method(name = "getHeaderByNumber")]
    async fn header_by_number(&self, hash: BlockNumberOrTag) -> RpcResult<Option<Header>>;

    /// Returns the block's header at given hash.
    #[method(name = "getHeaderByHash")]
    async fn header_by_hash(&self, hash: B256) -> RpcResult<Option<Header>>;

    /// `eth_simulateV1` executes an arbitrary number of transactions on top of the requested state.
    /// The transactions are packed into individual blocks. Overrides can be provided.
    #[method(name = "simulateV1")]
    async fn simulate_v1(
        &self,
        opts: SimulatePayload,
        block_number: Option<BlockId>,
    ) -> RpcResult<Vec<SimulatedBlock<<Ethereum as Network>::BlockResponse>>>;

    /// Executes a new message call immediately without creating a transaction on the block chain.
    #[method(name = "call")]
    async fn call(
        &self,
        request: TransactionRequest,
        block_number: Option<BlockId>,
        state_overrides: Option<StateOverride>,
        block_overrides: Option<Box<BlockOverrides>>,
    ) -> RpcResult<Bytes>;

    /// Simulate arbitrary number of transactions at an arbitrary blockchain index, with the
    /// optionality of state overrides
    #[method(name = "callMany")]
    async fn call_many(
        &self,
        bundle: Bundle,
        state_context: Option<StateContext>,
        state_override: Option<StateOverride>,
    ) -> RpcResult<Vec<EthCallResponse>>;

    /// Generates an access list for a transaction.
    ///
    /// This method creates an [EIP2930](https://eips.ethereum.org/EIPS/eip-2930) type accessList based on a given Transaction.
    ///
    /// An access list contains all storage slots and addresses touched by the transaction, except
    /// for the sender account and the chain's precompiles.
    ///
    /// It returns list of addresses and storage keys used by the transaction, plus the gas
    /// consumed when the access list is added. That is, it gives you the list of addresses and
    /// storage keys that will be used by that transaction, plus the gas consumed if the access
    /// list is included. Like eth_estimateGas, this is an estimation; the list could change
    /// when the transaction is actually mined. Adding an accessList to your transaction does
    /// not necessary result in lower gas usage compared to a transaction without an access
    /// list.
    #[method(name = "createAccessList")]
    async fn create_access_list(
        &self,
        request: TransactionRequest,
        block_number: Option<BlockId>,
    ) -> RpcResult<AccessListResult>;

    /// Generates and returns an estimate of how much gas is necessary to allow the transaction to
    /// complete.
    #[method(name = "estimateGas")]
    async fn estimate_gas(
        &self,
        request: TransactionRequest,
        block_number: Option<BlockId>,
        state_override: Option<StateOverride>,
    ) -> RpcResult<U256>;

    /// Returns the current price per gas in wei.
    #[method(name = "gasPrice")]
    async fn gas_price(&self) -> RpcResult<U256>;

    /// Returns the account details by specifying an address and a block number/tag
    #[method(name = "getAccount")]
    async fn get_account(
        &self,
        address: Address,
        block: BlockId,
    ) -> RpcResult<Option<alloy::rpc::types::Account>>;

    /// Introduced in EIP-1559, returns suggestion for the priority for dynamic fee transactions.
    #[method(name = "maxPriorityFeePerGas")]
    async fn max_priority_fee_per_gas(&self) -> RpcResult<U256>;

    /// Introduced in EIP-4844, returns the current blob base fee in wei.
    #[method(name = "blobBaseFee")]
    async fn blob_base_fee(&self) -> RpcResult<U256>;

    /// Returns the Transaction fee history
    ///
    /// Introduced in EIP-1559 for getting information on the appropriate priority fee to use.
    ///
    /// Returns transaction base fee per gas and effective priority fee per gas for the
    /// requested/supported block range. The returned Fee history for the returned block range
    /// can be a subsection of the requested range if not all blocks are available.
    #[method(name = "feeHistory")]
    async fn fee_history(
        &self,
        block_count: U64,
        newest_block: BlockNumberOrTag,
        reward_percentiles: Option<Vec<f64>>,
    ) -> RpcResult<FeeHistory>;

    /// Returns whether the client is actively mining new blocks.
    #[method(name = "mining")]
    async fn is_mining(&self) -> RpcResult<bool>;

    /// Returns the number of hashes per second that the node is mining with.
    #[method(name = "hashrate")]
    async fn hashrate(&self) -> RpcResult<U256>;

    /// Returns the hash of the current block, the seedHash, and the boundary condition to be met
    /// (“target”)
    #[method(name = "getWork")]
    async fn get_work(&self) -> RpcResult<Work>;

    /// Used for submitting mining hashrate.
    ///
    /// Can be used for remote miners to submit their hash rate.
    /// It accepts the miner hash rate and an identifier which must be unique between nodes.
    /// Returns `true` if the block was successfully submitted, `false` otherwise.
    #[method(name = "submitHashrate")]
    async fn submit_hashrate(&self, hashrate: U256, id: B256) -> RpcResult<bool>;

    /// Used for submitting a proof-of-work solution.
    #[method(name = "submitWork")]
    async fn submit_work(&self, nonce: B64, pow_hash: B256, mix_digest: B256) -> RpcResult<bool>;

    /// Sends transaction; will block waiting for signer to return the
    /// transaction hash.
    #[method(name = "sendTransaction")]
    async fn send_transaction(&self, request: TransactionRequest) -> RpcResult<B256>;

    /// Sends signed transaction, returning its hash.
    #[method(name = "sendRawTransaction")]
    async fn send_raw_transaction(&self, bytes: Bytes) -> RpcResult<B256>;

    /// Returns an Ethereum specific signature with: sign(keccak256("\x19Ethereum Signed Message:\n"
    /// + len(message) + message))).
    #[method(name = "sign")]
    async fn sign(&self, address: Address, message: Bytes) -> RpcResult<Bytes>;

    /// Signs a transaction that can be submitted to the network at a later time using with
    /// `sendRawTransaction.`
    #[method(name = "signTransaction")]
    async fn sign_transaction(&self, transaction: TransactionRequest) -> RpcResult<Bytes>;

    /// Signs data via [EIP-712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md).
    #[method(name = "signTypedData")]
    async fn sign_typed_data(&self, address: Address, data: TypedData) -> RpcResult<Bytes>;

    /// Returns the account and storage values of the specified account including the Merkle-proof.
    /// This call can be used to verify that the data you are pulling from is not tampered with.
    #[method(name = "getProof")]
    async fn get_proof(
        &self,
        address: Address,
        keys: Vec<JsonStorageKey>,
        block_number: Option<BlockId>,
    ) -> RpcResult<EIP1186AccountProofResponse>;
}

pub struct EthRpc;
#[async_trait]
impl EthApiServer for EthRpc {
    async fn protocol_version(&self) -> RpcResult<U64> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    fn syncing(&self) -> RpcResult<SyncStatus> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn author(&self) -> RpcResult<Address> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    fn accounts(&self) -> RpcResult<Vec<Address>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    fn block_number(&self) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn chain_id(&self) -> RpcResult<Option<U64>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_by_hash(
        &self,
        _hash: B256,
        _full: bool,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_by_number(
        &self,
        _number: BlockNumberOrTag,
        _full: bool,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_transaction_count_by_hash(&self, _hash: B256) -> RpcResult<Option<U256>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_transaction_count_by_number(
        &self,
        _number: BlockNumberOrTag,
    ) -> RpcResult<Option<U256>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_uncles_count_by_hash(&self, _hash: B256) -> RpcResult<Option<U256>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_uncles_count_by_number(
        &self,
        _number: BlockNumberOrTag,
    ) -> RpcResult<Option<U256>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn block_receipts(
        &self,
        _block_id: BlockId,
    ) -> RpcResult<Option<Vec<<Ethereum as Network>::ReceiptResponse>>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn uncle_by_block_hash_and_index(
        &self,
        _hash: B256,
        _index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn uncle_by_block_number_and_index(
        &self,
        _number: BlockNumberOrTag,
        _index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::BlockResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn raw_transaction_by_hash(&self, _hash: B256) -> RpcResult<Option<Bytes>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn transaction_by_hash(
        &self,
        _hash: B256,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn raw_transaction_by_block_hash_and_index(
        &self,
        _hash: B256,
        _index: Index,
    ) -> RpcResult<Option<Bytes>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn transaction_by_block_hash_and_index(
        &self,
        _hash: B256,
        _index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn raw_transaction_by_block_number_and_index(
        &self,
        _number: BlockNumberOrTag,
        _index: Index,
    ) -> RpcResult<Option<Bytes>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn transaction_by_block_number_and_index(
        &self,
        _number: BlockNumberOrTag,
        _index: Index,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn transaction_by_sender_and_nonce(
        &self,
        _address: Address,
        _nonce: U64,
    ) -> RpcResult<Option<<Ethereum as Network>::TransactionResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn transaction_receipt(
        &self,
        _hash: B256,
    ) -> RpcResult<Option<<Ethereum as Network>::ReceiptResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn balance(&self, _address: Address, _block_number: Option<BlockId>) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn storage_at(
        &self,
        _address: Address,
        _index: JsonStorageKey,
        _block_number: Option<BlockId>,
    ) -> RpcResult<B256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn transaction_count(
        &self,
        _address: Address,
        _block_number: Option<BlockId>,
    ) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn get_code(
        &self,
        _address: Address,
        _block_number: Option<BlockId>,
    ) -> RpcResult<Bytes> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn header_by_number(&self, _hash: BlockNumberOrTag) -> RpcResult<Option<Header>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn header_by_hash(&self, _hash: B256) -> RpcResult<Option<Header>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn simulate_v1(
        &self,
        _opts: SimulatePayload,
        _block_number: Option<BlockId>,
    ) -> RpcResult<Vec<SimulatedBlock<<Ethereum as Network>::BlockResponse>>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn call(
        &self,
        _request: TransactionRequest,
        _block_number: Option<BlockId>,
        _state_overrides: Option<StateOverride>,
        _block_overrides: Option<Box<BlockOverrides>>,
    ) -> RpcResult<Bytes> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn call_many(
        &self,
        _bundle: Bundle,
        _state_context: Option<StateContext>,
        _state_override: Option<StateOverride>,
    ) -> RpcResult<Vec<EthCallResponse>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn create_access_list(
        &self,
        _request: TransactionRequest,
        _block_number: Option<BlockId>,
    ) -> RpcResult<AccessListResult> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn estimate_gas(
        &self,
        _request: TransactionRequest,
        _block_number: Option<BlockId>,
        _state_override: Option<StateOverride>,
    ) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn gas_price(&self) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn get_account(
        &self,
        _address: Address,
        _block: BlockId,
    ) -> RpcResult<Option<alloy::rpc::types::Account>> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn max_priority_fee_per_gas(&self) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn blob_base_fee(&self) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn fee_history(
        &self,
        _block_count: U64,
        _newest_block: BlockNumberOrTag,
        _reward_percentiles: Option<Vec<f64>>,
    ) -> RpcResult<FeeHistory> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn is_mining(&self) -> RpcResult<bool> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn hashrate(&self) -> RpcResult<U256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn get_work(&self) -> RpcResult<Work> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn submit_hashrate(&self, _hashrate: U256, _id: B256) -> RpcResult<bool> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn submit_work(
        &self,
        _nonce: B64,
        _pow_hash: B256,
        _mix_digest: B256,
    ) -> RpcResult<bool> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn send_transaction(&self, _request: TransactionRequest) -> RpcResult<B256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn send_raw_transaction(&self, _bytes: Bytes) -> RpcResult<B256> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn sign(&self, _address: Address, _message: Bytes) -> RpcResult<Bytes> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn sign_transaction(&self, _transaction: TransactionRequest) -> RpcResult<Bytes> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn sign_typed_data(&self, _address: Address, _data: TypedData) -> RpcResult<Bytes> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }

    async fn get_proof(
        &self,
        _address: Address,
        _keys: Vec<JsonStorageKey>,
        _block_number: Option<BlockId>,
    ) -> RpcResult<EIP1186AccountProofResponse> {
        Err(ErrorObject::owned(0, "Not implemented", None::<()>))
    }
}
