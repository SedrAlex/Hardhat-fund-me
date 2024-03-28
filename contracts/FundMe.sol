// Get  funds from users
// Withdraw funds
// Set a minimum funding value in USD

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConvertor.sol";

// the const and the immutable are really great gas savers
// we use const when we deal with global variables, but we use immutable vars when we deal with vars inside the function or constructors

// custom error
error NotOwner();

contract FundMe {
    using PriceConverter for uint256;

    mapping(address => uint256) public addressToAmountFunded;
    address[] public funders;

    address public owner;
    uint256 public constant MINIMUM_USD = 50 * 1e18; // 1 * 10 ** 18 // it is a name convention to assigne names like this in capital letters and underscores to constants variable declaration

    AggregatorV3Interface public priceFeed;

    // it is a name convention to use i_var name with immutable

    constructor(address priceFeedAddress) {
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    //we want to send an amount fund amount in USD
    //1. How do we send eth to this contract?
    function fund() public payable {
        require(
            msg.value.getConversionRate(priceFeed) >= MINIMUM_USD,
            "Didn't send enough"
        ); //1e18 == 1 * 10 ** 18 =100

        // 18 decimals
        addressToAmountFunded[msg.sender] += msg.value;
        funders.push(msg.sender);

        //what is reverting?
        //undo any action before, and send remaining gas back
    }

    function withdraw() public onlyOwner {
        /*starting index, ending index, step amount*/
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }
        //reset the array
        funders = new address[](0);
        //actually withdraw the funds

        //transfer
        payable(msg.sender).transfer(address(this).balance);
        //send
        bool sendSuccess = payable(msg.sender).send(address(this).balance);
        require(sendSuccess, "send failed");
        // this is the most favourabile approach that is used to send native Etherium
        //call
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "call failed");
    }

    // this modifier is responsible for check if the require is applicable and then  deploying the contract withdraw after this
    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Sender is not owner!");
        if (msg.sender == owner) {
            revert NotOwner();
        }
        _;
    }

    // what happens if some one sends this contract ETH without calling the fund function
    // receive
    receive() external payable {
        fund();
    }

    // callback
    fallback() external payable {
        fund();
    }
}
