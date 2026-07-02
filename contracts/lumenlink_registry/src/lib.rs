#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Vec,
};
use core::option::Option;

const MAX_MEMO_BYTES: u32 = 28;
const MAX_LABEL_BYTES: u32 = 64;
const MAX_DESCRIPTION_BYTES: u32 = 512;
const MAX_PAGE_SIZE: u32 = 50;

#[contract]
pub struct Contract;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    RequestNotFound = 3,
    Unauthorized = 4,
    InvalidAmount = 5,
    InvalidMemo = 6,
    InvalidLabel = 7,
    InvalidDescription = 8,
    InvalidAssetCode = 9,
    InvalidExpiry = 10,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    NextId,
    Request(u64),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetSpec {
    Native,
    Credit(String, Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RequestInput {
    pub recipient: Address,
    pub asset: AssetSpec,
    pub amount: i128,
    pub memo: Option<String>,
    pub label: String,
    pub description: String,
    pub expires_at_ledger: Option<u32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RequestPatch {
    pub recipient: Option<Address>,
    pub amount: Option<i128>,
    pub memo: Option<Option<String>>,
    pub label: Option<String>,
    pub description: Option<String>,
    pub expires_at_ledger: Option<Option<u32>>,
    pub active: Option<bool>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Request {
    pub id: u64,
    pub owner: Address,
    pub recipient: Address,
    pub asset: AssetSpec,
    pub amount: i128,
    pub memo: Option<String>,
    pub label: String,
    pub description: String,
    pub expires_at_ledger: Option<u32>,
    pub active: bool,
    pub created_at_ledger: u32,
    pub updated_at_ledger: u32,
}

#[contractimpl]
impl Contract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        Self::require_auth(&admin);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &1u64);
        Ok(())
    }

    pub fn version() -> u32 {
        1
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        Self::read_admin(&env)
    }

    pub fn set_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), Error> {
        let current_admin = Self::read_admin(&env)?;
        if admin != current_admin {
            return Err(Error::Unauthorized);
        }
        Self::require_auth(&admin);
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        Ok(())
    }

    pub fn create_request(env: Env, owner: Address, input: RequestInput) -> Result<Request, Error> {
        Self::require_auth(&owner);
        Self::validate_input(&env, &input)?;

        let id = Self::next_id(&env)?;
        let now = env.ledger().sequence();
        let request = Request {
            id,
            owner,
            recipient: input.recipient,
            asset: input.asset,
            amount: input.amount,
            memo: input.memo,
            label: input.label,
            description: input.description,
            expires_at_ledger: input.expires_at_ledger,
            active: true,
            created_at_ledger: now,
            updated_at_ledger: now,
        };

        Self::store_request(&env, &request)?;
        env.storage().instance().set(&DataKey::NextId, &(id + 1));
        Ok(request)
    }

    pub fn get_request(env: Env, id: u64) -> Result<Request, Error> {
        Self::load_request(&env, id)
    }

    pub fn update_request(
        env: Env,
        actor: Address,
        id: u64,
        patch: RequestPatch,
    ) -> Result<Request, Error> {
        let mut request = Self::load_request(&env, id)?;
        Self::assert_can_manage(&env, &actor, &request)?;

        if let Some(recipient) = patch.recipient {
            request.recipient = recipient;
        }
        if let Some(amount) = patch.amount {
            if amount <= 0 {
                return Err(Error::InvalidAmount);
            }
            request.amount = amount;
        }
        if let Some(memo) = patch.memo {
            Self::validate_optional_memo(&memo)?;
            request.memo = memo;
        }
        if let Some(label) = patch.label {
            Self::validate_label(&label)?;
            request.label = label;
        }
        if let Some(description) = patch.description {
            Self::validate_description(&description)?;
            request.description = description;
        }
        if let Some(expires_at_ledger) = patch.expires_at_ledger {
            if let Some(expires_at_ledger) = expires_at_ledger {
                Self::validate_expiry(&env, expires_at_ledger)?;
                request.expires_at_ledger = Some(expires_at_ledger);
            } else {
                request.expires_at_ledger = None;
            }
        }
        if let Some(active) = patch.active {
            request.active = active;
        }

        request.updated_at_ledger = env.ledger().sequence();
        Self::store_request(&env, &request)?;
        Ok(request)
    }

    pub fn delete_request(env: Env, actor: Address, id: u64) -> Result<Request, Error> {
        let request = Self::load_request(&env, id)?;
        Self::assert_can_manage(&env, &actor, &request)?;
        env.storage().persistent().remove(&DataKey::Request(id));
        Ok(request)
    }

    pub fn list_requests(env: Env, owner: Address, start_after: u64, limit: u32) -> Result<Vec<Request>, Error> {
        let mut out: Vec<Request> = Vec::new(&env);
        let next_id = Self::next_id(&env)?;
        let cap = Self::normalize_limit(limit);
        let mut id = start_after.saturating_add(1);

        while id < next_id && out.len() < cap {
            if let Some(request) = Self::try_load_request(&env, id) {
                if request.owner == owner {
                    out.push_back(request);
                }
            }
            id += 1;
        }

        Ok(out)
    }

    fn read_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn next_id(env: &Env) -> Result<u64, Error> {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .ok_or(Error::NotInitialized)
    }

    fn load_request(env: &Env, id: u64) -> Result<Request, Error> {
        Self::try_load_request(env, id).ok_or(Error::RequestNotFound)
    }

    fn try_load_request(env: &Env, id: u64) -> Option<Request> {
        env.storage().persistent().get(&DataKey::Request(id))
    }

    fn store_request(env: &Env, request: &Request) -> Result<(), Error> {
        Self::validate_input(
            env,
            &RequestInput {
                recipient: request.recipient.clone(),
                asset: request.asset.clone(),
                amount: request.amount,
                memo: request.memo.clone(),
                label: request.label.clone(),
                description: request.description.clone(),
                expires_at_ledger: request.expires_at_ledger,
            },
        )?;
        env.storage()
            .persistent()
            .set(&DataKey::Request(request.id), request);
        Ok(())
    }

    fn assert_can_manage(env: &Env, actor: &Address, request: &Request) -> Result<(), Error> {
        let admin = Self::read_admin(env)?;
        if actor == &request.owner || actor == &admin {
            Self::require_auth(actor);
            Ok(())
        } else {
            Err(Error::Unauthorized)
        }
    }

    fn validate_input(env: &Env, input: &RequestInput) -> Result<(), Error> {
        if input.amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        Self::validate_asset(&input.asset)?;
        Self::validate_optional_memo(&input.memo)?;
        Self::validate_label(&input.label)?;
        Self::validate_description(&input.description)?;
        if let Some(expires_at_ledger) = input.expires_at_ledger {
            Self::validate_expiry(env, expires_at_ledger)?;
        }
        Ok(())
    }

    fn validate_asset(asset: &AssetSpec) -> Result<(), Error> {
        match asset {
            AssetSpec::Native => Ok(()),
            AssetSpec::Credit(code, _) => {
                let len = code.len();
                if len == 0 || len > 12 {
                    return Err(Error::InvalidAssetCode);
                }
                Ok(())
            }
        }
    }

    fn validate_optional_memo(memo: &Option<String>) -> Result<(), Error> {
        if let Some(memo) = memo {
            if memo.len() > MAX_MEMO_BYTES {
                return Err(Error::InvalidMemo);
            }
        }
        Ok(())
    }

    fn validate_label(label: &String) -> Result<(), Error> {
        let len = label.len();
        if len == 0 || len > MAX_LABEL_BYTES {
            return Err(Error::InvalidLabel);
        }
        Ok(())
    }

    fn validate_description(description: &String) -> Result<(), Error> {
        if description.len() > MAX_DESCRIPTION_BYTES {
            return Err(Error::InvalidDescription);
        }
        Ok(())
    }

    fn validate_expiry(env: &Env, expires_at_ledger: u32) -> Result<(), Error> {
        if expires_at_ledger <= env.ledger().sequence() {
            return Err(Error::InvalidExpiry);
        }
        Ok(())
    }

    fn normalize_limit(limit: u32) -> u32 {
        if limit == 0 {
            0
        } else if limit > MAX_PAGE_SIZE {
            MAX_PAGE_SIZE
        } else {
            limit
        }
    }

    #[cfg(not(test))]
    fn require_auth(actor: &Address) {
        actor.require_auth();
    }

    #[cfg(test)]
    fn require_auth(_actor: &Address) {}
}

mod test;
