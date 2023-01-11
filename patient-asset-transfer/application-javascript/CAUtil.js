exports.buildCAClient = (FabricCAServices, ccp, caHostName) => {
  const caInfo = ccp.certificateAuthorities[caHostName];
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const caClient = new FabricCAServices(caInfo.url, {trustedRoots: caTLSCACerts, verify: false}, caInfo.caName);

  console.log(`Built a CA Client named ${caInfo.caName}`);
  return caClient;
};

exports.enrollAdmin = async (caClient, wallet, orgMspId, adminUserId, adminUserPasswd) => {
  try {

    const identity = await wallet.get(adminUserId);
    if (identity) {
      console.log('An identity for the admin user already exists in the wallet');
      return;
    }

    const enrollment = await caClient.enroll({enrollmentID: adminUserId, enrollmentSecret: adminUserPasswd});
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(adminUserId, x509Identity);
    console.log('Successfully enrolled admin user and imported it into the wallet');
  } catch (error) {
    console.error(`Failed to enroll admin user : ${error}`);
  }
};

exports.registerAndEnrollUser = async (caClient, wallet, orgMspId, userId, adminUserId, attributes, affiliation) => {
  try {

    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(`An identity for the user ${userId} already exists in the wallet`);
      throw new Error(`An identity for the user ${userId} already exists in the wallet`);
    }

    const adminIdentity = await wallet.get(adminUserId);
    if (!adminIdentity) {
      console.log(`An identity for the admin user ${adminUserId} does not exist in the wallet`);
      throw new Error(`An identity for the admin user ${adminUserId} does not exist in the wallet`);
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminUserId);

    attributes = JSON.parse(attributes);
    const firstName = attributes.firstName;
    const lastName = attributes.lastName;
    const role = attributes.role;
    const speciality = (role === 'doctor') ? attributes.speciality : '';

    const secret = await caClient.register({
      affiliation: affiliation,
      enrollmentID: userId,

      role: 'client',
      attrs: [{
        name: 'firstName',
        value: firstName,
        ecert: true,
      },
      {
        name: 'lastName',
        value: lastName,
        ecert: true,
      },
      {
        name: 'role',
        value: role,
        ecert: true,
      },
      {
        name: 'speciality',
        value: speciality,
        ecert: true,
      }],
    }, adminUser);
    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
      attrs: [{
        name: 'firstName',
        value: firstName,
        ecert: true,
      },
      {
        name: 'lastName',
        value: lastName,
        ecert: true,
      },
      {
        name: 'role',
        value: role,
        ecert: true,
      },
      {
        name: 'speciality',
        value: speciality,
        ecert: true,
      }],
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(userId, x509Identity);
    console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
  } catch (error) {
    console.error(`Failed to register user ${userId} : ${error}`);
    throw new Error(`Failed to register user ${userId}`);
  }
};
