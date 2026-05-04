import { ethers } from "ethers";

import { WalletService } from "./wallet";

function createHash(
  from: string,
  to: string,
  amountWei: bigint,
  nonce: number,
) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256"],
      [from, to, amountWei, nonce],
    ),
  );
}

export async function signPayload(
  //   wallet: Wallet,
  from: string,
  to: string,
  amountEth: string, // ****
  nonce: number,
) {
  const amountWei = ethers.parseEther(amountEth); //

  const hash = createHash(from, to, amountWei, nonce);

  const wallet = await WalletService.getLocalWallet();

  // const signature = wallet.signingKey.sign(hash); // old method (not secure)

  const flatSig = await wallet.signMessage(ethers.getBytes(hash));
  const signature = ethers.Signature.from(flatSig);

  return signature; // { r, s, v }
}

// //smart contract function
// bytes32 hash = keccak256(
//     abi.encode(from, to, amount, nonce)
// );

// address signer = ecrecover(hash, v, r, s);
