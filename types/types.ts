// export interface WalletData {
//   receiver: string;
//   amount: number;
// }

interface NotSignedPayload {
  receiver: string;
  amount: string;
  currency: "ETH";
  network: "Sepolia";
  timestamp: number;
}

// interface SignedPayload {
//   receiver: string;
//   //   amount: number;
//   amount: string; // wei
//   currency: "ETH";
//   network: "Sepolia";
//   nonce: number;
//   timestamp: number;
//   v: number;
//   r: string;
//   s: string;
// }
export type SignedPayloadOld = {
  from: string;
  to: string;
  amount: string;
  nonce: number;
  signature: { r: string; s: string; v: number };
  uuid: string;
  signedAt: number;
};

export interface TXPayload {
  type: string; // NOT_SIGNED
  data: NotSignedPayload;
}

export interface TXPayload2 {
  type: string; // SIGNED
  data: SignedPayload;
}

export type TXPayload3 =
  | {
      type: "NOT_SIGNED";
      data: NotSignedPayload;
    }
  | {
      type: "SIGNED";
      data: SignedPayload;
    };

export type SignedPayload = {
  status: string;
  isOwner: boolean;
  from: string;
  to: string;
  amount: string;
  nonce: number;
  uuid: string;
  signature: {
    r: string;
    s: string;
    v: 27 | 28;
  };
  signedAt: number;
};
// function execute(
//     address from,
//     address to,
//     uint256 amount,
//     uint256 nonce,
//     uint8 v,
//     bytes32 r,
//     bytes32 s
// )

// export type SignedPayload2 = {
//   type: string;
//   data: {
//     status: string;
//     isOwner: boolean;
//     from: string;
//     to: string;
//     amount: string;
//     nonce: number;
//     uuid: string;
//     signature: {
//       r: string;
//       s: string;
//       v: 27 | 28;
//     };
//     signedAt: number;
//   };
// };
