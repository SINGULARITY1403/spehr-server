const {ROLE_DOCTOR, capitalize, getMessage, validateRole} = require('../utils.js');
const network = require('../../patient-asset-transfer/application-javascript/app.js');

exports.updatePatientMedicalDetails = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_DOCTOR], userRole, res);
  let args = req.body;
  args.patientId = req.params.patientId;
  args.changedBy = req.headers.username;
  args= [JSON.stringify(args)];

  const networkObj = await network.connectToNetwork(req.headers.username);

  const response = await network.invoke(networkObj, false, capitalize(userRole) + 'Contract:updatePatientMedicalDetails', args);
  (response.error) ? res.status(500).send(response.error) : res.status(200).send(getMessage(false, 'Successfully Updated Patient.'));
};

exports.getDoctorById = async (req, res) => {

  const userRole = req.headers.role;
  await validateRole([ROLE_DOCTOR], userRole, res);
  const hospitalId = parseInt(req.params.hospitalId);

  const userId = hospitalId === 1 ? 'hosp1admin' : hospitalId === 2 ? 'hosp2admin' : '';
  const doctorId = req.params.doctorId;
  const networkObj = await network.connectToNetwork(userId);

  const response = await network.getAllDoctorsByHospitalId(networkObj, hospitalId);

  (response.error) ? res.status(500).send(response.error) : res.status(200).send(response.filter(
    function(response) {
      return response.id === doctorId;
    },
  )[0]);
};
