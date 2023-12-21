const { ethers } = require("hardhat");
//0x396862a62b9aA611ccAaD03C8A6a8B18CbC7eB47
require("dotenv").config();
// const provider = new ethers.providers.JsonRpcProvider(process.env.URL);
async function main() {
  const accounts = await ethers.getSigners();
  const plan = [1, 2, 3, 1];
  const timePeriod = [1, 1, 2, 3];
  const CryptoWalletInsuranceFactory = await hre.ethers.getContractFactory(
    "CryptoWalletInsuranceFactory"
  );
  const _value = await hre.ethers.utils.parseEther("1");
  const cryptoWalletInsuranceFactory =
    await CryptoWalletInsuranceFactory.deploy({ value: _value });
  await cryptoWalletInsuranceFactory.deployed();

  console.log(
    `Factory Contract deployed to ${cryptoWalletInsuranceFactory.address}`
  );
  const contractsArray = await deployStorageContracts(4, accounts);
  await storeValues(contractsArray, accounts);
  console.log("Values Stored");

  const getAmount = await getInsuranceAmount(contractsArray, plan, timePeriod);

  const insuranceContractAddresses = await getInsurance(
    plan,
    contractsArray,
    timePeriod,
    cryptoWalletInsuranceFactory,
    accounts,
    getAmount
  );
  console.log("////////////////Insurance Contracts Deployed/////////////////");
  await getStorageBalance(contractsArray);
  await withdrawValues(contractsArray, accounts);
  console.log("Values withdrawn");
  await getStorageBalance(contractsArray);

  let contractBalance = await provider.getBalance(
    cryptoWalletInsuranceFactory.address
  );
  let bal = hre.ethers.utils.formatEther(contractBalance.toString());
  console.log("Contract balance is " + bal);
  await claimInsurance(accounts, insuranceContractAddresses);
  contractBalance = await provider.getBalance(
    cryptoWalletInsuranceFactory.address
  );
  bal = hre.ethers.utils.formatEther(contractBalance.toString());
  console.log("Contract balance after claim is " + bal);
}

//Helping Functions
async function claimInsurance(accounts, contractArray) {
  const CryptoWalletInsurance = await hre.ethers.getContractFactory(
    "CryptoWalletInsurance"
  );
  for (let i = 0; i < contractArray.length; i++) {
    const contract = await CryptoWalletInsurance.attach(contractArray[i]);
    await contract.connect(accounts[i]).claim();
    console.log(await provider.getBalance(contract.address));
  }
}

async function deployContract(index, deployer) {
  const Contract = await hre.ethers.getContractFactory("Storage");
  const contract = await Contract.connect(deployer).deploy();
  await contract.deployed();

  console.log("/////DEPLOY CONTRACT/////");
  console.log(
    `Storage ${index} Contract deployed to ${contract.address} by ${deployer.address}`
  );
  console.log("//////");
  return contract;
}
async function deployStorageContracts(quantity, accounts) {
  const contracts = [];
  for (let i = 0; i < quantity; i++) {
    contracts.push(await deployContract(i, accounts[i]));
  }
  return contracts;
}
async function storeValues(contractArray, accounts) {
  for (let i = 0; i < contractArray.length; i++) {
    const contract = contractArray[i];
    let _value = await hre.ethers.utils.parseEther(((i + 1) / 10).toString());
    const tx = await contract.connect(accounts[i]).store({ value: _value });
    await tx.wait();
  }
}
async function withdrawValues(contractArray, accounts) {
  for (let i = 0; i < contractArray.length; i++) {
    const contract = contractArray[i];
    let _value = hre.ethers.utils.parseEther(((i + 0.5) / 10).toString());
    const tx = await contract.connect(accounts[i]).withdraw(_value);
    await tx.wait();
  }
}
async function getStorageBalance(contractArray) {
  for (let i = 0; i < contractArray.length; i++) {
    const contract = contractArray[i];
    let _value = await provider.getBalance(contract.address);
    console.log("Value of " + i + " is " + _value);
  }
}

async function getInsurance(
  plans,
  contractArray,
  timePeriods,
  factoryContract,
  accounts,
  getAmount
) {
  const insuranceContractAddresses = [];
  for (let i = 0; i < contractArray.length; i++) {
    const contract = contractArray[i];
    const account = accounts[i];
    const plan = plans[i];
    const timePeriod = timePeriods[i];
    const _value = getAmount[i];
    await factoryContract
      .connect(account)
      .getInsurance(plan, contract.address, timePeriod, {
        value: _value,
      });
    const insuranceContract = await factoryContract.customerToContract(
      account.address
    );
    insuranceContractAddresses.push(insuranceContract);

    console.log("////GET INSURANCE/////");
    console.log(
      `Insurance Contract deployed for ${contract.address} by ${account.address} and the address of NEW INSURANCE is ${insuranceContract}`
    );
    console.log("/////////");
  }
  return insuranceContractAddresses;
}

async function getInsuranceAmount(contractArray, plans, timePeriods) {
  let amountPayableArray = [];
  for (let i = 0; i < contractArray.length; i++) {
    const contractBalance = await hre.ethers.provider.getBalance(
      contractArray[i].address
    );
    //Plans are not proportional to amount send directly
    let plan = plans[i];
    if (plan == 2) {
      plan = 5;
    } else if (plan == 3) {
      plan = 10;
    }
    const timePeriod = timePeriods[i];
    const amountPayable = (contractBalance * plan * timePeriod) / 100;
    amountPayableArray.push(amountPayable.toString());
    console.log(
      `Insurance Contract Amount Payable is ${amountPayable} for ${contractArray[i].address}`
    );
  }
  return amountPayableArray;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
