const address = "0x87839a1c5E8f331a67F387166D06219079152b63";
const USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const API_KEY = "4GFZQAWZGCFTYJHHD8WYVIGD9UT7S9MHAU";

const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance&contractaddress=${USDT_CONTRACT}&address=${address}&tag=latest&apikey=${API_KEY}`;

const res = await fetch(url);
const json = await res.json();

if (json.status === "1") {
  const balance = Number(json.result) / 1e6;
  console.log(`${balance.toFixed(2)}`);
} else {
  console.log("Error:", json.message, json.result);
}
