import { task } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import {
  HardhatConfig,
  HardhatRuntimeEnvironment,
  TaskArguments,
} from "hardhat/types";
import fetch from "node-fetch";
import path from "path";

task("blockscount-verify", async function (
  args: TaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  if (!validateArgs(args)) {
    throw new NomicLabsHardhatPluginError(
      "hardhat-blockscount-verify",
      "Missing args for this task"
    );
  }
  const fileName = args.fileName;
  const address = args.address;
  const contractName = path.basename(fileName, ".sol");
  if (!validateContractName(hre.config, contractName)) {
    throw new NomicLabsHardhatPluginError(
      "hardhat-blockscount-verify",
      "Contracts is not defined in Hardhat config"
    );
  }
  if (!validateBlockscoutURL(hre.config)) {
    throw new NomicLabsHardhatPluginError(
      "hardhat-blockscount-verify",
      "Blockscout URL is not defined in Hardhat config"
    );
  }
  console.log(`Task will process ${contractName} in ${fileName}`);
  const flattenContent = await hre.run("smart-flatten", {
    files: [fileName],
  });
  console.log("File flatten has completed");
  const verifyConfig = hre.config.blockscoutVerify!.contracts[contractName];
  const params: any = {
    addressHash: address,
    name: contractName,
    compilerVersion: verifyConfig!.compilerVersion,
    optimization: verifyConfig!.optimization,
    contractSourceCode: flattenContent,
    autodetectConstructorArguments: "true",
    evmVersion: verifyConfig!.evmVersion,
    optimizationRuns: verifyConfig!.optimizationRuns,
  };
  const blockscoutURL = hre.config.blockscoutVerify.blockscoutURL;
  try {
    console.log(`Sending file for verification to ${blockscoutURL}`);
    console.log(`Contract address is ${address}`);
    const verifyRes = await fetch(
      `${blockscoutURL}/api?module=contract&action=verify`,
      {
        method: "POST",
        body: JSON.stringify(params),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (verifyRes.status === 200) {
      console.log(`${contractName} is verified`);
    } else {
      throw new NomicLabsHardhatPluginError(
        "hardhat-blockscount-verify",
        "Fail to verify contract"
      );
    }
  } catch (e) {
    throw new NomicLabsHardhatPluginError(
      "hardhat-blockscount-verify",
      "Fail to verify contract"
    );
  }
});

function validateArgs(args: TaskArguments): boolean {
  return args.fileName !== null && args.address !== null;
}

function validateBlockscoutURL(hreConfig: HardhatConfig) {
  if (hreConfig.blockscoutVerify.blockscoutURL === null) {
    return false;
  }
  let url;
  try {
    url = new URL(hreConfig.blockscoutVerify.blockscoutURL);
  } catch (_) {
    return false;
  }
  return true;
}

function validateContractName(hreConfig: HardhatConfig, contractName: string) {
  return (
    hreConfig.blockscoutVerify !== undefined &&
    hreConfig.blockscoutVerify.contracts !== undefined &&
    hreConfig.blockscoutVerify.contracts[contractName] !== undefined
  );
}
