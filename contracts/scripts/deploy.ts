import { ethers, run, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  Digital Executor — LifeContract Deployment");
  console.log("=".repeat(60));
  console.log(`  Network:  ${network.name}`);
  console.log(`  Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:  ${ethers.formatEther(balance)} ETH`);
  console.log("");

  // Deploy LifeContract with 180-day threshold
  const THRESHOLD_DAYS = 180;
  console.log(`  Deploying LifeContract (threshold: ${THRESHOLD_DAYS} days)...`);

  const LifeContract = await ethers.getContractFactory("LifeContract");
  const life = await LifeContract.deploy(THRESHOLD_DAYS);
  await life.waitForDeployment();

  const address = await life.getAddress();
  console.log(`  LifeContract deployed to: ${address}`);
  console.log("");

  // Wait for block confirmations before verifying
  if (network.name === "sepolia") {
    console.log("  Waiting for 5 confirmations before Etherscan verification...");
    const deployTx = life.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(5);
    }

    console.log("  Verifying on Etherscan...");
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [THRESHOLD_DAYS],
      });
      console.log("  Etherscan verification: SUCCESS");
      console.log(`  https://sepolia.etherscan.io/address/${address}#code`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Already Verified")) {
        console.log("  Already verified.");
      } else {
        console.warn("  Etherscan verification failed:", msg);
      }
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE");
  console.log(`  LifeContract: ${address}`);
  console.log(`  Threshold:    ${THRESHOLD_DAYS} days`);
  console.log(`  Etherscan:    https://sepolia.etherscan.io/address/${address}`);
  console.log("=".repeat(60));
  console.log("");
  console.log("  Add to your .env:");
  console.log(`  LIFE_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
