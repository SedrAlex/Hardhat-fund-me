const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
    const deployer = await  getNamedAccounts()
    const fundMe = await ethers.get
}
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error)
    process.exit(1)
})

