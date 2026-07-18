#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use std::format;

fn setup() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);

    (env, admin, owner, recipient)
}

fn base_request(env: &Env, recipient: Address) -> RequestInput {
    RequestInput {
        recipient,
        asset: AssetSpec::Native,
        amount: 1_250_000,
        memo: Some(String::from_str(env, "Invoice-01")),
        label: String::from_str(env, "Design retainer"),
        description: String::from_str(env, "First milestone payment for June work"),
        expires_at_ledger: Some(env.ledger().sequence() + 100),
    }
}

fn credit_request(env: &Env, recipient: Address, code: &str) -> RequestInput {
    RequestInput {
        recipient,
        asset: AssetSpec::Credit(String::from_str(env, code), Address::generate(env)),
        amount: 1_250_000,
        memo: Some(String::from_str(env, "Invoice-01")),
        label: String::from_str(env, "Design retainer"),
        description: String::from_str(env, "First milestone payment for June work"),
        expires_at_ledger: Some(env.ledger().sequence() + 100),
    }
}

#[test]
fn init_create_read_update_delete_flow() {
    let (env, admin, owner, recipient) = setup();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&admin);
    assert_eq!(client.get_admin(), admin.clone());
    assert_eq!(client.version(), 1);

    let created = client.create_request(&owner, &base_request(&env, recipient.clone()));
    assert_eq!(created.id, 1);
    assert_eq!(created.owner, owner);
    assert_eq!(created.recipient, recipient);
    assert_eq!(created.amount, 1_250_000);
    assert_eq!(created.active, true);

    let fetched = client.get_request(&1);
    assert_eq!(fetched, created.clone());

    let updated = client.update_request(
        &owner,
        &1,
        &RequestPatch {
            recipient: Some(Address::generate(&env)),
            amount: Some(2_000_000),
            memo: Some(Some(String::from_str(&env, "Invoice-01-REV1"))),
            label: Some(String::from_str(&env, "Updated retainer")),
            description: Some(String::from_str(&env, "Revised scope")),
            expires_at_ledger: Some(Some(env.ledger().sequence() + 200)),
            active: Some(false),
        },
    );

    assert_eq!(updated.id, 1);
    assert_eq!(updated.amount, 2_000_000);
    assert_eq!(updated.active, false);

    let removed = client.delete_request(&owner, &1);
    assert_eq!(removed.id, 1);
    assert_eq!(
        env.as_contract(&contract_id, || Contract::load_request(&env, 1)),
        Err(Error::RequestNotFound)
    );
}

#[test]
fn validate_input_rules() {
    let (env, admin, owner, recipient) = setup();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    let mut invalid = base_request(&env, recipient.clone());
    invalid.amount = 0;
    assert_eq!(
        Contract::validate_input(&env, &invalid),
        Err(Error::InvalidAmount)
    );

    let mut invalid = base_request(&env, recipient.clone());
    invalid.memo = Some(String::from_str(
        &env,
        "this memo is definitely longer than twenty eight bytes",
    ));
    assert_eq!(
        Contract::validate_input(&env, &invalid),
        Err(Error::InvalidMemo)
    );

    let mut invalid = base_request(&env, recipient);
    invalid.label = String::from_str(&env, "");
    assert_eq!(
        Contract::validate_input(&env, &invalid),
        Err(Error::InvalidLabel)
    );

    let _ = owner;
}

#[test]
fn reject_invalid_asset_code_and_expiry() {
    let (env, _admin, owner, recipient) = setup();

    let mut invalid_asset = credit_request(&env, recipient.clone(), "");
    assert_eq!(
        Contract::create_request(env.clone(), owner.clone(), invalid_asset.clone()),
        Err(Error::InvalidAssetCode)
    );

    invalid_asset.asset = AssetSpec::Credit(
        String::from_str(&env, "TOO-LONG-CODE"),
        Address::generate(&env),
    );
    assert_eq!(
        Contract::create_request(env.clone(), owner.clone(), invalid_asset),
        Err(Error::InvalidAssetCode)
    );

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.initialize(&owner);

    let mut expired = base_request(&env, recipient);
    expired.expires_at_ledger = Some(env.ledger().sequence());
    assert_eq!(
        Contract::validate_input(&env, &expired),
        Err(Error::InvalidExpiry)
    );
}

#[test]
fn management_requires_owner_or_admin() {
    let (env, admin, owner, recipient) = setup();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    let created = client.create_request(&owner, &base_request(&env, recipient));
    let outsider = Address::generate(&env);

    assert_eq!(
        env.as_contract(&contract_id, || {
            Contract::update_request(
                env.clone(),
                outsider.clone(),
                created.id,
                RequestPatch {
                    recipient: None,
                    amount: Some(2_000_000),
                    memo: None,
                    label: None,
                    description: None,
                    expires_at_ledger: None,
                    active: None,
                },
            )
        }),
        Err(Error::Unauthorized)
    );

    assert_eq!(
        env.as_contract(&contract_id, || Contract::delete_request(env.clone(), outsider, created.id)),
        Err(Error::Unauthorized)
    );
}

#[test]
fn list_requests_caps_page_size() {
    let (env, admin, owner, recipient) = setup();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    for idx in 0..60 {
        let mut request = base_request(&env, recipient.clone());
        request.label = String::from_str(&env, &format!("Request-{idx}"));
        client.create_request(&owner, &request);
    }

    let listed = client.list_requests(&owner, &0, &100);
    assert_eq!(listed.len(), 50);
    assert_eq!(listed.get(0).unwrap().label, String::from_str(&env, "Request-0"));
    assert_eq!(listed.get(49).unwrap().label, String::from_str(&env, "Request-49"));
}

#[test]
fn list_filters_by_owner() {
    let (env, admin, owner_one, recipient) = setup();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    client.initialize(&admin);
    let owner_two = Address::generate(&env);

    let mut req = base_request(&env, recipient.clone());
    client.create_request(&owner_one, &req);

    req.label = String::from_str(&env, "Second");
    req.description = String::from_str(&env, "Other request");
    client.create_request(&owner_two, &req);

    req.label = String::from_str(&env, "Third");
    req.description = String::from_str(&env, "Owner one again");
    client.create_request(&owner_one, &req);

    let listed = client.list_requests(&owner_one, &0, &10);
    assert_eq!(listed.len(), 2);
    assert_eq!(listed.get(0).unwrap().owner, owner_one);
    assert_eq!(listed.get(1).unwrap().owner, owner_one);
}

#[test]
fn admin_rotation_changes_admin() {
    let (env, admin, _owner, _recipient) = setup();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let next_admin = Address::generate(&env);

    client.initialize(&admin);
    client.set_admin(&admin, &next_admin);
    assert_eq!(client.get_admin(), next_admin);
}
