const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")

describe("FundMe", async function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.parseEther("1") //1 ETH

    beforeEach(async function () {
        // deploy our fundme contract
        // using Hardhat-deploy
        // const accounts = await ethers.getSigners()
        // const accountZero  = accounts[0]
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer,
        )
    })

    describe("constructor", async function () {
        it("sets the aggregator address correctly", async () => {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, await mockV3Aggregator.getAddress())
        })
    })
    describe("fund", async function () {
        it("Fails if you do not send enough ETH", async () => {
            await expect(fundMe.fund({})).to.be.revertedWith(
                "You need to spend more ETH!",
            )
        })
        it("updated the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.getAddressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.getFunder(0)
            assert.equal(funder, deployer)
        })
        it("withdraws ETH from a single funder", async () => {
            // Arrange
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address,
            )
            const startingDeployerBalance =
                await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address,
            )
            const endingDeployerBalance =
                await fundMe.provider.getBalance(deployer)

            // Assert
            // Maybe clean up to understand the testing
            assert.equal(endingFundMeBalance, 0)
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString(),
            )
        })
        // this test is overloaded. Ideally we'd split it into multiple tests
        // but for simplicity we left it as one
        it("is allows us to withdraw with multiple funders", async () => {
            // Arrange
            const accounts = await ethers.getSigners()
            for (i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                    accounts[i],
                )
                await fundMeConnectedContract.fund({ value: sendValue })
            }
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address,
            )
            const startingDeployerBalance =
                await fundMe.provider.getBalance(deployer)

            // Act
            const transactionResponse = await fundMe.cheaperWithdraw()
            // Let's comapre gas costs :)
            // const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
            console.log(`GasCost: ${withdrawGasCost}`)
            console.log(`GasUsed: ${gasUsed}`)
            console.log(`GasPrice: ${effectiveGasPrice}`)
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address,
            )
            const endingDeployerBalance =
                await fundMe.provider.getBalance(deployer)
            // Assert
            assert.equal(
                startingFundMeBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(withdrawGasCost).toString(),
            )
            // Make a getter for storage variables
            await expect(fundMe.getFunder(0)).to.be.reverted

            for (i = 1; i < 6; i++) {
                assert.equal(
                    await fundMe.getAddressToAmountFunded(accounts[i].address),
                    0,
                )
            }
        })
        it("only allows the owner to withdraw ", async function () {
            //Arrange
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await fundMe.connect(attacker)
            await expect(
                attackerConnectedContract.withdraw(),
            ).to.be.revertedWith("FundMe__NotOwner")
        })
    })
})
