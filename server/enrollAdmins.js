const {Wallets} = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const {buildCAClient, enrollAdmin} = require('../patient-asset-transfer/application-javascript/CAUtil.js');
const {buildCCPHosp1, buildWallet} = require('../patient-asset-transfer/application-javascript/AppUtil.js');
const {buildCCPHosp2, buildWallet} = require('../patient-asset-transfer/application-javascript/AppUtil.js');
const adminHospital1 = 'hosp1admin';
const adminHospital1Passwd = 'hosp1lithium';
const adminHospital2 = 'hosp2admin';
const adminHospital2Passwd = 'hosp2lithium';


const mspHosp1 = 'hosp1MSP';
const mspHosp2 = 'hosp2MSP';
const walletPath = path.join(__dirname, '../patient-asset-transfer/application-javascript/wallet');

exports.enrollAdmins = async function() {
  try {

    const ccp1 = await buildCCPHosp1();
    const ccp2 = await buildCCPHosp2();

    const caClient1 = await buildCAClient(FabricCAServices, ccp1, 'ca.hosp1.lithium.com');
    const caClient2 = await buildCAClient(FabricCAServices, ccp2, 'ca.hosp2.lithium.com');

    const wallet = await buildWallet(Wallets, walletPath);

    await enrollAdmin(caClient1, wallet, mspHosp1, adminHospital1, adminHospital1Passwd);
    await enrollAdmin(caClient2, wallet, mspHosp2, adminHospital2, adminHospital2Passwd);

    console.log('msg: Successfully enrolled admin user ' + adminHospital1 + ' and' + adminHospital2 + ', also imported it into the wallet');
  } catch (error) {
    console.error(`Failed to enroll admin users + : ${error}`);
    process.exit(1);
  }
};
