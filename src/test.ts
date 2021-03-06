// Import
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { SignedBlock } from '@polkadot/types/interfaces/runtime';
import { decodeAddress } from "@polkadot/util-crypto";

var api:ApiPromise;
var signedBlock:SignedBlock;

async function main(){
  const blockHash = "0x89b2e12bd8d1e9815ccc4ef6b14d41b1756d40a1f447b1744bd4189bc3bf6b5f";
  const extrinsicHash = "0xb834bff0dfb765693ca5ce171b20a39ff0474f9b3b21e102071aa94fb75b1e55";
  console.log(`${blockHash}: ${extrinsicHash}`);

  // Construct
  const wsProvider = new WsProvider('wss://rpc.polkadot.io');
  api = await ApiPromise.create({ provider: wsProvider });
  
  let data:VercelResult;
  if(blockHash && typeof blockHash === "string" && extrinsicHash && typeof extrinsicHash === "string"){
    data = await extractValue(blockHash, extrinsicHash);
  }

  console.log(data);
}

async function extractValue(blockHash: string, extrinsicHash: string): Promise<VercelResult> { 
    const data:VercelResult = {ok:false};
  
    // no blockHash is specified, so we retrieve the latest
    signedBlock = await api.rpc.chain.getBlock(blockHash);
    if(!signedBlock){
      data.msg = "can not get block: " + blockHash;
      return data;
    }
    data.blockNum = Number(signedBlock.block.header.number.toBigInt());
    
    let extrinsicIndex:number;
    const theExtrinsic = signedBlock.block.extrinsics.find((extrinsic, index) => {
      if(extrinsic.hash.eq(extrinsicHash)){
        extrinsicIndex = index;
        return true;
      }else{
        return false;
      }
    })
    if(!theExtrinsic || !theExtrinsic.isSigned){
      data.msg = "can not get signed extrinsic: " + extrinsicHash;
      return data;
    }
  
    const allRecords = await api.query.system.events.at(signedBlock.block.header.hash);
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
  
          const args = theExtrinsic.args;
          if(parseInt(args[0].toString()) === 2017){
            data.ok = true;
            data.publicKey = "0x" + Buffer.from(decodeAddress(theExtrinsic.signer.toString())).toString("hex");
            data.value = parseInt(args[1].toString());
          }else{
            data.msg = "invalid chainId: " + parseInt(args[0].toString());
          }
          // console.log(`${theExtrinsic.method.section}.${theExtrinsic.method.method}:: ExtrinsicSuccess:: ${dispatchInfo.toHuman()}`);
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
  
          data.ok = false;
          data.msg = `${theExtrinsic.method.section}.${theExtrinsic.method.method}:: ExtrinsicFailed:: ${errorInfo}`;
        }
      });
  
      return data;
  }

  interface VercelResult {
    ok: boolean;
    msg?: string;
    value?: number;
    publicKey?: string;
    blockNum?: number;
  }
  

main();