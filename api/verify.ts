import { VercelRequest, VercelResponse } from '@vercel/node';
import { cryptoWaitReady, decodeAddress, signatureVerify } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const testPublicAddr = "WuCxWAfuWgGRY6oEABmjorBWAxVjFCEBcaEAAV4cenijcbr";
const testEvmAddr = "0xFB83a67784F110dC658B19515308A7a95c2bA33A";
const testSign = "0x96644fa61dce77339b7b07ff49feec44075242f26d5d83d1820c0a055b47087d33b20082ae094cea6d64cd4bb74da18a17c7f3c3f4226de4313e1bbe97e1c983";

const keyPublicAddr = "polkadotKey";
const keyEvmAddr = "evmAddress";
const keySign = "signature";

export default async (request: VercelRequest, response: VercelResponse) => {
  //get params from request
  const publicAddr = request.query[keyPublicAddr];
  const evmAddr = request.query[keyEvmAddr];
  const sign = request.query[keySign];
  // console.log(`${publicAddr}: ${evmAddr}: ${sign}`)

  let result = false;
  if(publicAddr && typeof publicAddr === "string" && evmAddr && typeof evmAddr === "string" && sign && typeof sign === "string"){
    await cryptoWaitReady();
    result = isValidSignature(evmAddr, sign, publicAddr);
  }
  response.status(200).send(result);
};

const isValidSignature = (signedMessage:string, signature:string, address:string) => {
  try {
    const publicKey = decodeAddress(address);
    const hexPublicKey = u8aToHex(publicKey);
    return signatureVerify(signedMessage, signature, hexPublicKey).isValid; 
  } catch (error) {
    console.error(error)
    return false;
  }
};