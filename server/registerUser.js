const {Wallets} = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const {buildCAClient, registerAndEnrollUser} = require('../patient-asset-transfer/application-javascript/CAUtil.js');
const walletPath = path.join(__dirname, '/../patient-asset-transfer/application-javascript/wallet');
const {buildCCPHosp1, buildCCPHosp2, buildWallet} = require('../patient-asset-transfer/application-javascript/AppUtil.js');
let mspOrg;
let adminUserId;
let caClient;

exports.enrollRegisterUser = async function(hospitalId, userId, attributes) {
  try {

    const wallet = await buildWallet(Wallets, walletPath);
    hospitalId = parseInt(hospitalId);

    if (hospitalId === 1) {

      const ccp = buildCCPHosp1();

      caClient = buildCAClient(FabricCAServices, ccp, 'ca.hosp1.lithium.com');

      mspOrg = 'hosp1MSP';
      adminUserId = 'hosp1admin';
    } else if (hospitalId === 2) {

      const ccp = buildCCPHosp2();

      caClient = buildCAClient(FabricCAServices, ccp, 'ca.hosp2.lithium.com');

      mspOrg = 'hosp2MSP';
      adminUserId = 'hosp2admin';
    }

    await registerAndEnrollUser(caClient, wallet, mspOrg, userId, adminUserId, attributes);
    console.log('msg: Successfully enrolled user ' + userId + ' and imported it into the wallet');
  } catch (error) {
    console.error(`Failed to register user "${userId}": ${error}`);
    process.exit(1);
  }
};
