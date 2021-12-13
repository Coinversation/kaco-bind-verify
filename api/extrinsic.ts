// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import { VercelRequest, VercelResponse } from "@vercel/node";
import type { SignedBlock } from '@polkadot/types/interfaces/runtime';

var api:ApiPromise;
var signedBlock:SignedBlock;

export default async (request: VercelRequest, response: VercelResponse) => {

  const blockHash = request.query["blockHash"];
  const extrinsicHash = request.query["extrinsicHash"];
  console.log(`${blockHash}: ${extrinsicHash}`);

  // Construct
  const wsProvider = new WsProvider('wss://rpc.polkadot.io');
  api = await ApiPromise.create({ provider: wsProvider });
  
  let data:string;
  if(blockHash && typeof blockHash === "string" && extrinsicHash && typeof extrinsicHash === "string"){
    data = await extractValue(blockHash, extrinsicHash);
  }

  return response.status(200).json({ok: true, data: `${data}`});
}

async function extractValue(blockHash: string, extrinsicHash: string): Promise<string> { 

  // no blockHash is specified, so we retrieve the latest
  signedBlock = await api.rpc.chain.getBlock(blockHash);
  const allRecords = await api.query.system.events.at(signedBlock.block.header.hash);
  // allRecords = await api.at(blockHash);

  let extrinsicIndex:number;
  const theExtrinsic = signedBlock.block.extrinsics.find((extrinsic, index) => {
    extrinsic.hash.eq(extrinsicHash);
    extrinsicIndex = index;
  })
  if(!theExtrinsic || !theExtrinsic.isSigned){
    return "0";
  }

  // map between the extrinsics and events
  allRecords
    // filter the specific events based on the phase and then the
    // index of our extrinsic in the block
    .filter(({ phase }) =>
      phase.isApplyExtrinsic &&
      phase.asApplyExtrinsic.eq(extrinsicIndex)
    )
    // test the events against the specific types we are looking for
    .forEach(({ event }) => {
      if (api.events.system.ExtrinsicSuccess.is(event)) {
        // extract the data for this event
        // (In TS, because of the guard above, these will be typed)
        const [dispatchInfo] = event.data;

        console.log(`${theExtrinsic.method.section}.${theExtrinsic.method.method}:: ExtrinsicSuccess:: ${dispatchInfo.toHuman()}`);
      } else if (api.events.system.ExtrinsicFailed.is(event)) {
        // extract the data for this event
        const [dispatchError, dispatchInfo] = event.data;
        let errorInfo;

        // decode the error
        if (dispatchError.isModule) {
          // for module errors, we have the section indexed, lookup
          // (For specific known errors, we can also do a check against the
          // api.errors.<module>.<ErrorName>.is(dispatchError.asModule) guard)
          const decoded = api.registry.findMetaError(dispatchError.asModule);

          errorInfo = `${decoded.section}.${decoded.name}`;
        } else {
          // Other, CannotLookup, BadOrigin, no extra info
          errorInfo = dispatchError.toString();
        }

        console.log(`${theExtrinsic.method.section}.${theExtrinsic.method.method}:: ExtrinsicFailed:: ${errorInfo}`);
      }
    });

  
    return "method: " + theExtrinsic.method.toJSON() + 
    "signer: " + theExtrinsic.signer.toString() + 
    "args: " + theExtrinsic.args.toString();
}


interface VercelResult {
  ok: boolean;
  msg?: string;
  data: boolean;
}
