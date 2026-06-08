# Emergency Fund Trigger

A Stellar testnet web demo for OFW emergency remittances. The sender prepares a
bounded payout in advance, signs it once with Freighter, and a trusted recipient
can submit that signed transaction later when an emergency happens.

## Why this uses Stellar

- **Pre-signed transactions:** the sender can authorize a specific payout before
  the emergency happens.
- **Time bounds:** each authorization expires, limiting stale approvals.
- **Fast settlement:** the recipient can submit the transaction on Stellar
  testnet at any hour.
- **Multisig-ready design:** a production version can use a dedicated emergency
  account with signer weights, thresholds, and rotating pre-authorized
  transactions.

## Run the website

This implementation is a static browser app in `web/`.

```powershell
npm install
npm run dev
```

Open <http://localhost:3001>.

Use Freighter on **Test Net**. The app can fund the sender with Friendbot, create
an emergency authorization, store the signed XDR locally, and submit it later
from the recipient trigger panel.

## Demo flow

1. Connect Freighter.
2. Enter the recipient testnet public key.
3. Choose amount, expiry, and emergency reason.
4. Sign the authorization once.
5. Click **Trigger payout** to submit the pre-signed transaction.
6. Open the Stellar Expert link after the payout succeeds.

## Notes

The current demo uses XLM for the shortest reliable workshop flow. USDC support
can be added after the recipient creates a trustline.

For a stronger production architecture, create a dedicated emergency account and
use Stellar multisig thresholds plus `preAuthTx` signers. That lets the recipient
trigger only specific pre-authorized transactions while normal fund movement
remains controlled by the sender's policy.
