import hre from "hardhat";
const { ethers } = hre;
import { expect } from "chai";
import { CarbonoToken, CarbonoRegistry } from "../typechain-types";

describe("🏢 CARBONO LEDGER: SUITE DE PRUEBAS DE CONSORCIO", function () {
  let token: CarbonoToken;
  let registry: CarbonoRegistry;
  
  let publicador: any; 
  let auditor: any;    
  let comprador: any;  
  let empresaNueva: any;

  const CID_IPFS = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const MONTO_CO2 = BigInt(500);

  const QUORUM_FIX = {
    gasPrice: 0,
    gasLimit: 10000000
  };

  before(async function () {
    const signers = await ethers.getSigners();
    publicador = signers[0]; 
    auditor = signers[1];    
    comprador = signers[2];
    empresaNueva = signers[3] || signers[0];

    const TokenFactory = await ethers.getContractFactory("CarbonoToken");
    token = await TokenFactory.deploy(QUORUM_FIX);
    await token.waitForDeployment();
    
    const tokenAddress = await token.getAddress();
    const RegistryFactory = await ethers.getContractFactory("CarbonoRegistry");
    registry = await RegistryFactory.deploy(tokenAddress, QUORUM_FIX);
    await registry.waitForDeployment();

    const registryAddress = await registry.getAddress();

    await (await token.setRegistryContract(registryAddress, QUORUM_FIX)).wait(1);
    await (await registry.addAuditor(auditor.address, QUORUM_FIX)).wait(1);
    await (await registry.addPublicador(publicador.address, QUORUM_FIX)).wait(1);
  });

  describe("📍 Fase 0: Gestión de Identidades (Nodo Auditor)", function () {
    it("Debería permitir al admin registrar una nueva Empresa Generadora", async function () {
      const tx = await registry.addPublicador(empresaNueva.address, QUORUM_FIX);
      await tx.wait(1);
      
      // 🔧 CORRECCIÓN AQUÍ: Se usa 'publicadores' porque así se llama tu mapping en el .sol
      const esPublicador = await registry.publicadores(empresaNueva.address);
      expect(esPublicador).to.be.true;
    });
  });

  describe("📍 Fase 1: Publicación (Nodo 1)", function () {
    it("Debería permitir al Nodo Publicador registrar un proyecto", async function () {
      const tx = await registry.connect(publicador).registerProject(CID_IPFS, MONTO_CO2, QUORUM_FIX);
      const receipt = await tx.wait(1);
      
      expect(receipt?.status).to.equal(1);
      
      const p = await registry.projects(1);
      expect(p.isVerified).to.be.false;
      expect(p.owner).to.equal(publicador.address);
    });
  });

  describe("📍 Fase 2: Auditoría y Validación (Nodo Auditor)", function () {
    it("Debería permitir al Nodo Auditor verificar el proyecto", async function () {
      const tx = await registry.connect(auditor).verifyProject(1, QUORUM_FIX);
      await tx.wait(1);
      
      const p = await registry.projects(1);
      expect(p.isVerified).to.be.true;
    });

    it("Debería permitir al Nodo Auditor rechazar un proyecto si la evidencia es mala", async function () {
      // Registramos un proyecto nuevo para rechazarlo
      await (await registry.connect(publicador).registerProject("BAD_CID", 100, QUORUM_FIX)).wait(1);
      
      const tx = await registry.connect(auditor).rejectProject(2, QUORUM_FIX);
      await tx.wait(1);
      
      const p = await registry.projects(2);
      expect(p.isRejected).to.be.true;
    });
  });

  describe("📍 Fase 3: Emisión de ECOS y Mercado", function () {
    it("Debería emitir los tokens ECOS al publicador", async function () {
      const tx = await registry.connect(publicador).issueCredits(1, QUORUM_FIX);
      await tx.wait(1);
      
      const balance = await token.balanceOf(publicador.address);
      expect(balance).to.equal(MONTO_CO2);
    });

    it("Debería ejecutar la transferencia al Nodo Comprador", async function () {
      const monto = BigInt(200);
      const tx = await token.connect(publicador).transfer(comprador.address, monto, QUORUM_FIX);
      await tx.wait(1);
      
      expect(await token.balanceOf(comprador.address)).to.equal(monto);
    });
  });

  describe("📍 Fase 4: Neutralidad (Quema)", function () {
    it("Debería reducir el totalSupply al quemar tokens", async function () {
      const totalAntes = await token.totalSupply();
      const tx = await token.connect(comprador).burn(BigInt(100), QUORUM_FIX);
      await tx.wait(1);
      
      const totalDespues = await token.totalSupply();
      expect(totalAntes - totalDespues).to.equal(BigInt(100));
    });
  });
});