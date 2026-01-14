import hre from "hardhat";
const { ethers } = hre;
import { expect } from "chai";
import * as dotenv from "dotenv";
import { CarbonoToken, CarbonoRegistry } from "../typechain-types";

dotenv.config();

async function main() {
  // Configuración de proveedores para verificar conexión
  const nodes = [
    { name: "NODO 1 (Publicador)", url: process.env.RPC_PUBLICADOR },
    { name: "NODO 2 (Auditor)", url: process.env.RPC_AUDITOR },
    { name: "NODO 3 (Comprador/Quorum)", url: process.env.RPC_COMPRADOR }
  ];

  console.log("\n🔍 VERIFICANDO CONEXIÓN CON EL CONSORCIO...");
  for (const node of nodes) {
    const provider = new ethers.JsonRpcProvider(node.url);
    try {
      await provider.getNetwork();
      console.log(` ✅ ${node.name}: Conectado.`);
    } catch (e) {
      console.error(` ❌ ${node.name}: Error de conexión en ${node.url}`);
      process.exit(1);
    }
  }

  const [admin] = await ethers.getSigners();
  console.log(`\n🔑 Ejecutando con Admin: ${admin.address}`);

  console.log("\n====================================================");
  console.log("🚀 DESPLIEGUE ESTRATÉGICO: CARBONO LEDGER");
  console.log("====================================================\n");

  // --- PASO 1: DEPLOY TOKEN ---
  console.log("📦 Desplegando CarbonoToken (Estándar ECOS)...");
  const TokenFactory = await ethers.getContractFactory("CarbonoToken");
  const token = (await TokenFactory.deploy()) as CarbonoToken;
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`   ➤ Contrato Token: ${tokenAddr}`);

  // --- PASO 2: DEPLOY REGISTRY ---
  console.log("📦 Desplegando CarbonoRegistry (Cerebro del Mercado)...");
  const RegistryFactory = await ethers.getContractFactory("CarbonoRegistry");
  const registry = (await RegistryFactory.deploy(tokenAddr)) as CarbonoRegistry;
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`   ➤ Contrato Registry: ${registryAddr}`);

  // --- PASO 3: ORQUESTACIÓN DE ROLES ---
  console.log("\n⚙️  CONFIGURANDO ECOISTEMA DE 3 NODOS...");

  console.log("   🔗 Vinculando Token al Registry...");
  const tx1 = await token.setRegistryContract(registryAddr);
  await tx1.wait();

  console.log(`   🏢 Habilitando Nodo 1 como Publicador: ${process.env.ADDR_PUBLICADOR}`);
  const tx2 = await registry.addPublicador(process.env.ADDR_PUBLICADOR!);
  await tx2.wait();

  console.log(`   ⚖️  Habilitando Nodo 2 como Auditor: ${process.env.ADDR_AUDITOR}`);
  const tx3 = await registry.addAuditor(process.env.ADDR_AUDITOR!);
  await tx3.wait();

  // --- PASO 4: VERIFICACIÓN FINAL ---
  console.log("\n🏁 VERIFICACIÓN DE ESTADO POST-DEPLOY:");
  const isPub = await registry.publicadores(process.env.ADDR_PUBLICADOR!);
  const isAud = await registry.auditors(process.env.ADDR_AUDITOR!);
  const linkedReg = await token.registryContract();

  console.log(`   📊 Nodo 1 Autorizado: ${isPub ? "✅" : "❌"}`);
  console.log(`   📊 Nodo 2 Autorizado: ${isAud ? "✅" : "❌"}`);
  console.log(`   📊 Vinculación Correcta: ${linkedReg === registryAddr ? "✅" : "❌"}`);

  console.log("\n====================================================");
  console.log("🎉 CARBONO LEDGER OPERATIVO SIN TESSERA");
  console.log(`REGISTRY: ${registryAddr}`);
  console.log(`TOKEN:    ${tokenAddr}`);
  console.log("====================================================\n");
}

main().catch((error) => {
  console.error("\n❌ ERROR CRÍTICO EN EL DEPLOY:");
  console.error(error);
  process.exitCode = 1;
});