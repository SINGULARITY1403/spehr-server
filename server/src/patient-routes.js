const {ROLE_ADMIN, ROLE_DOCTOR, ROLE_PATIENT, capitalize, getMessage, validateRole} = require('../utils.js');
const network = require('../../patient-asset-transfer/application-javascript/app.js');

exports.getPatientById = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_DOCTOR, ROLE_PATIENT], userRole, res);
  const patientId = req.params.patientId;

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, true, capitalize(userRole) + 'Contract:readPatient', patientId);
  (response.error) ? res.status(400).send(response.error) : res.status(200).send(JSON.parse(response));
};

exports.updatePatientPersonalDetails = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_PATIENT], userRole, res);

  let args = req.body;
  args.patientId = req.params.patientId;
  args.changedBy = req.params.patientId;
  args= [JSON.stringify(args)];

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, false, capitalize(userRole) + 'Contract:updatePatientPersonalDetails', args);
  (response.error) ? res.status(500).send(response.error) : res.status(200).send(getMessage(false, 'Successfully Updated Patient.'));
};

exports.getPatientHistoryById = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_DOCTOR, ROLE_PATIENT], userRole, res);
  const patientId = req.params.patientId;

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, true, capitalize(userRole) + 'Contract:getPatientHistory', patientId);
  const parsedResponse = await JSON.parse(response);
  (response.error) ? res.status(400).send(response.error) : res.status(200).send(parsedResponse);
};

exports.getDoctorsByHospitalId = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_PATIENT, ROLE_ADMIN], userRole, res);
  const hospitalId = parseInt(req.params.hospitalId);

  userId = hospitalId === 1 ? 'hosp1admin' : hospitalId === 2 ? 'hosp2admin' : '';
  const networkObj = await network.connectToNetwork(userId);

  const response = await network.getAllDoctorsByHospitalId(networkObj, hospitalId);
  (response.error) ? res.status(500).send(response.error) : res.status(200).send(response);
};

exports.grantAccessToDoctor = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_PATIENT], userRole, res);
  const patientId = req.params.patientId;
  const doctorId = req.params.doctorId;
  let args = {patientId: patientId, doctorId: doctorId};
  args= [JSON.stringify(args)];

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, false, capitalize(userRole) + 'Contract:grantAccessToDoctor', args);
  (response.error) ? res.status(500).send(response.error) : res.status(200).send(getMessage(false, `Access granted to ${doctorId}`));
};

exports.revokeAccessFromDoctor = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_PATIENT], userRole, res);
  const patientId = req.params.patientId;
  const doctorId = req.params.doctorId;
  let args = {patientId: patientId, doctorId: doctorId};
  args= [JSON.stringify(args)];

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, false, capitalize(userRole) + 'Contract:revokeAccessFromDoctor', args);
  (response.error) ? res.status(500).send(response.error) : res.status(200).send(getMessage(false, `Access revoked from ${doctorId}`));
};
