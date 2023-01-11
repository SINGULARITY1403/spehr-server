const {ROLE_ADMIN, ROLE_DOCTOR, capitalize, getMessage, validateRole, createRedisClient} = require('../utils.js');
const network = require('../../patient-asset-transfer/application-javascript/app.js');

exports.createPatient = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_ADMIN], userRole, res);

  const networkObj = await network.connectToNetwork(req.headers.username);

  if (!('patientId' in req.body) || req.body.patientId === null || req.body.patientId === '') {
    const lastId = await network.invoke(networkObj, true, capitalize(userRole) + 'Contract:getLatestPatientId');
    req.body.patientId = 'PID' + (parseInt(lastId.slice(3)) + 1);
  }

  if (!('password' in req.body) || req.body.password === null || req.body.password === '') {
    req.body.password = Math.random().toString(36).slice(-8);
  }

  req.body.changedBy = req.headers.username;

  const data = JSON.stringify(req.body);
  const args = [data];

  const createPatientRes = await network.invoke(networkObj, false, capitalize(userRole) + 'Contract:createPatient', args);
  if (createPatientRes.error) {
    res.status(400).send(response.error);
  }

  const userData = JSON.stringify({hospitalId: (req.headers.username).slice(4, 5), userId: req.body.patientId});
  const registerUserRes = await network.registerUser(userData);
  if (registerUserRes.error) {
    await network.invoke(networkObj, false, capitalize(userRole) + 'Contract:deletePatient', req.body.patientId);
    res.send(registerUserRes.error);
  }

  res.status(201).send(getMessage(false, 'Successfully registered Patient.', req.body.patientId, req.body.password));
};

exports.createDoctor = async (req, res) => {

  const userRole = req.headers.role;
  let {hospitalId, username, password} = req.body;
  hospitalId = parseInt(hospitalId);

  await validateRole([ROLE_ADMIN], userRole, res);

  req.body.userId = username;
  req.body.role = ROLE_DOCTOR;
  req.body = JSON.stringify(req.body);
  const args = [req.body];

  const redisClient = createRedisClient(hospitalId);
  (await redisClient).SET(username, password);

  const response = await network.registerUser(args);
  if (response.error) {
    (await redisClient).DEL(username);
    res.status(400).send(response.error);
  }
  res.status(201).send(getMessage(false, response, username, password));
};

exports.getAllPatients = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_ADMIN, ROLE_DOCTOR], userRole, res);

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, true, capitalize(userRole) + 'Contract:queryAllPatients',
    userRole === ROLE_DOCTOR ? req.headers.username : '');
  const parsedResponse = await JSON.parse(response);
  res.status(200).send(parsedResponse);
};
