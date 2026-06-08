# Emergency Fund Trigger

Fill this in as you build. It doubles as your **submission README**, and it maps
directly to how projects are judged: meaningful Stellar use, real problem, and a
working demo.

## Idea
- **Track:** Remittance / Financial Inclusion / Social Impact
- **Idea # (from the 300-ideas list, if any):** 6
- **One-liner:** A pre-authorized emergency remittance vault that lets a trusted family member trigger an urgent transfer at any hour, while the OFW keeps control through Stellar multisig and pre-signed transactions.

## Problem
OFWs often need to support family emergencies in the Philippines: hospital
deposits, medicine, urgent travel, school payments, or disaster response. These
situations do not always happen during banking hours, and the sender may be
asleep, at work, in a different time zone, or unable to access their wallet
immediately.

The recipient needs funds fast, but the sender still needs guardrails so the
emergency fund cannot be casually drained. The product should make urgent access
possible without turning every emergency into a real-time coordination problem.

## Solution
The sender creates a bounded emergency authorization ahead of time: recipient,
asset, amount, expiry, and optional reason. They sign the transaction once. Later,
if an emergency happens, the trusted recipient can submit that pre-signed
transaction and receive the funds immediately.

The app should make the state clear:
- **Ready:** emergency authorization exists and can still be triggered.
- **Triggered:** recipient submitted the pre-signed transaction.
- **Paid:** Stellar transaction succeeded.
- **Expired:** authorization can no longer be used.

## How it uses Stellar
Stellar is the core mechanism, not just the payment rail:

- **Multisignature:** The emergency account can use signer weights and thresholds
  so normal fund movement stays controlled.
- **Pre-signed transactions:** The sender approves a specific emergency payout in
  advance. The recipient can submit it later without needing the sender online.
- **Time bounds and sequence numbers:** The authorization can expire, and used
  transactions cannot be replayed.
- **Low-cost, fast settlement:** The recipient can receive funds quickly, including
  outside bank hours.
- **Optional USDC path:** The demo can start with XLM, then extend to USDC once the
  recipient has a trustline.

## What works in the demo
- [ ] Connect wallet (Freighter, testnet)
- [ ] Core flow runs end-to-end on testnet
- [ ] Sender creates an emergency authorization with amount, recipient, reason, and expiry
- [ ] Sender signs the emergency payout once
- [ ] Recipient triggers the emergency transfer later by submitting the pre-signed transaction
- [ ] App shows status: authorized, triggered, expired, or paid

## Setup / run
How a judge runs it locally:
- Network: **testnet**
- `cd web && npm install && npm run dev`
- Contract (if used): `.\scripts\deploy.ps1`, then set `NEXT_PUBLIC_CONTRACT_ID`
- Any other env vars / steps:
  - Use Freighter on Test Net.
  - Fund sender and recipient accounts with Friendbot.
  - For USDC mode, create the recipient trustline first.

## Demo
- 2-4 min video link (show the core flow working on testnet):
- Public repo link:

## Submission checklist
- [ ] Public GitHub repo with a license (this scaffold ships MIT - update `LICENSE`)
- [ ] README explains problem, Stellar usage, and setup
- [ ] Demo video (2-4 min)
- [ ] Submitted via the workshop's official GitHub issue template
