import { VercelRequest, VercelResponse } from '@vercel/node';
import { cryptoWaitReady, decodeAddress, signatureVerify } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const keyPublicKey = "polkadotKey";
const keyEvmAddr = "evmAddress";
const keySign = "signature";

export default async (request: VercelRequest, response: VercelResponse) => {
  if(request.headers.authorization !== `Bearer ${process.env.VERCEL_TOKEN}`){
    return response.status(401).send("invalid token.")
  }
  //get params from request
  const polkadotPublicKey = request.query[keyPublicKey];
  const evmAddr = request.query[keyEvmAddr];
  const sign = request.query[keySign];
  console.log(`${polkadotPublicKey}: ${evmAddr}: ${sign}`)

  let result = false;
  if(polkadotPublicKey && typeof polkadotPublicKey === "string" && evmAddr && typeof evmAddr === "string" && sign && typeof sign === "string"){
    await cryptoWaitReady();
    result = isValidSignature(evmAddr, sign, polkadotPublicKey);
  }
  return response.status(200).send(result);
};

const isValidSignature = (signedMessage:string, signature:string, polkadotPubKey:string) => {
  try {
    const publicKey = decodeAddress(polkadotPubKey);
    const hexPublicKey = u8aToHex(publicKey);
    return signatureVerify(signedMessage, signature, hexPublicKey).isValid; 
  } catch (error) {
    console.error(error)
    return false;
  }
};