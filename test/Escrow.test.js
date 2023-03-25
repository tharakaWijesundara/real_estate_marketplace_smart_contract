const { expect } = require("chai");
const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender, realEstate;

  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    // console.log(realEstate.signer.address);

    let transacion = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png"
      );
    await transacion.wait();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      lender.address,
      inspector.address,
      seller.address
    );

    // let owner = await realEstate.connect(seller).ownerOf(1)
    // console.log(owner)

    // Approve property

    transacion = await realEstate.connect(seller).approve(escrow.address, 1);
    await transacion.wait();

    // List property
    transacion = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transacion.wait();
  });

  describe("Deployment", () => {
    it("returns NFT address", async function () {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });

    it("returns seller", async function () {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });
    it("returns inspector", async function () {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });
    it("returns lender", async function () {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("Listing", () => {
    it("Updates as listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });
    it("updates ownership", async function () {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });
    it("Returns buyer", async function () {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });

    it("Returns purchase price", async function () {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });
    it("Returns purchase price", async function () {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });
  describe("Listing", () => {
    it("Updates contract balance", async function () {
      const transacion = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transacion.wait();
      const result = await escrow.getBalance();

      expect(result).to.be.equal(tokens(5));
    });
  });
  describe("Inspection", () => {
    it("Updates inspection status", async function () {
      const transacion = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transacion.wait();
      const result = await escrow.inspectionPassed(1);

      expect(result).to.be.equal(true);
    });
  });
  describe("Approvale", () => {
    it("Updates approval status", async function () {
      transacion = await escrow.connect(buyer).approveSale(1);
      await transacion.wait();

      transacion = await escrow.connect(seller).approveSale(1);
      await transacion.wait();

      transacion = await escrow.connect(lender).approveSale(1);
      await transacion.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });
  describe("Sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      transaction = await escrow.connect(seller).finalizeSale(1);
      await transaction.wait();
    });

    it("Updates ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });

    it("Updates balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
