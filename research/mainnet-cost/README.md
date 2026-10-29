# Mainnet cost optimization — measured 2026-10-29

Research only, not a release. No on-chain transaction was signed or broadcast. No live Site/Nile file changed.

## Reproducible provenance

The shipped Mainnet artifact (Site source d483fdf589aed59ebe9906a58246969a4bee6d60) bytecode matches contracts/TakasV8Invite.sol at GitHub commit **864d5efecba47433301078c0cdcf43f070c996e3**, compiled with official TRON Solidity0.8.31, optimizer enabled/runs200, viaIR true, evmVersion paris, source unit TakasV8Invite.sol. `baseline-input.json` retains exact input; `baseline-match.json` records match. Original creation6152/runtime6068bytes.

Official compiler: https://tronprotocol.github.io/solc-bin/wasm/soljson-v0.8.31+commit.c2812a3d.js
SHA256 d0f2092759c99c3e983cf3dce38f75eb32377bf4cfc904cf34c2a6f8b04356b8 verified against official wasm/list.json. Set TRON_SOLC_PATH to downloaded CommonJS .cjs file. `node research/mainnet-cost/compile.cjs` emits matrix. No compiler binary committed.

The current repository source at1367b6a contains additional prior-block wallet commitments and separate refundable TRX fees for token payers; it must not be confused with the old deployed build. It has a separate matrix in ../mainnet-cost-guarded. Its commitment/security checks were kept intact.

## Measured Mainnet constructor simulations

All successful wallet/triggerconstantcontract requests used no contract_address, data=creation bytecode, and returned result.result=true. These execute constructor/code-deposit on TVM without deploying a contract. Current Energy price100sun/Energy.

| Variant | Energy | Energy TRX (no resources) | Estimated single-signature Bandwidth TRX (no quota) | Sum before reserve |
|---|---:|---:|---:|---:|
| Shipped source, strings/runs200/viaIR | 1,254,983 | 125.4983 | 7.214 | 132.7123 |
| Same source, strings/runs1/viaIR | 1,251,583 | 125.1583 | not measured | — |
| Same source, custom errors/runs1/viaIR | 1,006,922 | 100.6922 | 6.263 | 106.9552 |
| Current guarded source, strings/runs200/viaIR | 1,501,462 | 150.1462 | not measured | — |
| Current guarded source, custom errors/runs1/viaIR | 1,234,176 | 123.4176 | 7.693 | 131.1106 |

Old-source constructor Energy saving19.766%; guarded-source saving17.802%. The guarded candidate has only a modest saving versus the OLD shipped build, because it adds protections. Do not market the unguarded100.69TRX candidate as the secured production solution.

Changes: replace revert strings with zero-argument custom errors (error codes E1…En), optimizer runs200→1. No predicate, state ordering, transfer, fee or timing guard removed. Function/event ABI remains; error ABI/revert data changes. Compiler input/source and result matrices included.

Bandwidth estimate uses unsigned wallet/deploycontract response with FLAT fields (abi string, bytecode, owner_address, name…), verifies raw_data_hex contains bytecode, computes raw_data protobuf field envelope + one65-byte signature field +64 result allowance. No signature was generated. Exact eventual size can vary with final fields/signature count. The earlier5TRX reserve was insufficient if no resource quota; old deployed build estimate is7.214TRX. Do not present5TRX as a guarantee.

## Runtime checks and limitations

-24 inherited baseline behavior tests pass against optimized baseline source on Ganache/EVM.
-29 current behavior tests pass against optimized guarded source on Ganache/EVM, including timeout/refund, fee handling and wallet commitments.
-These are EVM tests, NOT a TVM runtime-flow test or independent audit.
-EVM same-flow receipt gas (create, mint, approve, depositA, depositB, finalize): baseline [118290,44135,44119,88916,136828,93245]; optimized [118263,44135,44119,88940,136904,93185]. Excluding mint, runtime total increased13gas. Thus NO meaningful per-swap reduction proved. Do not convert EVM gas differences to a guaranteed TRON Energy price.
-Nile historical flow353,478Energy≈35.3478TRX + up to1.960TRX observed Bandwidth; token contracts/Mainnet dynamic factors can change consumption. Current guarded flow includes2 extra commitment transactions and cannot inherit that cheaper old-flow total.
-Token allowance reset must be skipped only when current allowance is sufficient, never assume approvals are free or permanent. No transaction-removal redesign is released.

## Resource economics checked 2026-10-29

https://tenergy.me/pricing advertised28sun/Energy for1h and5%new-user service fee. Not a binding quote/endorsement. At that rate, guarded candidate with20%Energy buffer: ceil(1,234,176*1.2)=1,481,012Energy; indicative rent43.5417528TRX +~7.693TRX Bandwidth≈51.2348TRX, plus any activation/provider costs. The old candidate's same calculation≈35.5247TRX rent+6.263≈41.7877TRX. Resource delivery/availability/minimum order and exact total need a live quote. All paid options still require real funds. Existing volunteered delegation may avoid rent, self-staking requires capital; neither removes protocol resource consumption. feeLimit is a cap, not a price discount.

## Next release gate

Run guarded optimized bytecode on a local TVM or separately authorized Nile test deployment, execute deposits/finalize/timeout refunds and measure all receipts. Current environment has no docker/TVM runner, and no authorization to spend even test funds was assumed. Do not replace live bytecode until those tests and source review pass. No audit performed.
