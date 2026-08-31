import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const RECIPIENT = "0x13C701c96ff8830822C536289964879E721E750A"; // put your receiving address here
const THRESHOLD = ethers.parseUnits("50", 6); // 0.003 USDT
const SEND_AMOUNT = ethers.parseUnits("50", 6);

const USDT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, wallet);

async function checkAndSend() {
  const balance = await usdt.balanceOf(wallet.address);
  if (balance > THRESHOLD) {
    const tx = await usdt.transfer(RECIPIENT, SEND_AMOUNT);
    console.log("1");
    await tx.wait();
  } else {
    console.log("0");
  }
}

setInterval(checkAndSend, 60_000);
checkAndSend();