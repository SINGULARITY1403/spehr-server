const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const jwtSecretToken = 'password';
const refreshSecretToken = 'refreshpassword';
let refreshTokens = [];

const app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(cors());

app.listen(3001, () => console.log('Backend server running on 3001'));

const patientRoutes = require('./patient-routes');
const doctorRoutes = require('./doctor-routes');
const adminRoutes = require('./admin-routes');
const {ROLE_DOCTOR, ROLE_ADMIN, ROLE_PATIENT, CHANGE_TMP_PASSWORD} = require('../utils');
const {createRedisClient, capitalize, getMessage} = require('../utils');
const network = require('../../patient-asset-transfer/application-javascript/app.js');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    if (token === '' || token === 'null') {
      return res.status(401).send('Unauthorized request: Token is missing');
    }
    jwt.verify(token, jwtSecretToken, (err, user) => {
      if (err) {
        return res.status(403).send('Unauthorized request: Wrong or expired token found');
      }
      req.user = user;
      next();
    });
  } else {
    return res.status(401).send('Unauthorized request: Token is missing');
  }
};

function generateAccessToken(username, role) {
  return jwt.sign({username: username, role: role}, jwtSecretToken, {expiresIn: '5m'});
}

app.post('/login', async (req, res) => {

  let {username, password, hospitalId, role} = req.body;
  hospitalId = parseInt(hospitalId);
  let user;

  if (role === ROLE_DOCTOR || role === ROLE_ADMIN) {

    const redisClient = await createRedisClient(hospitalId);

    const value = await redisClient.get(username);

    user = value === password;
    redisClient.quit();
  }

  if (role === ROLE_PATIENT) {
    const networkObj = await network.connectToNetwork(username);
    const newPassword = req.body.newPassword;

    if (newPassword === null || newPassword === '') {
      const value = crypto.createHash('sha256').update(password).digest('hex');
      const response = await network.invoke(networkObj, true, capitalize(role) + 'Contract:getPatientPassword', username);
      if (response.error) {
        res.status(400).send(response.error);
      } else {
        const parsedResponse = await JSON.parse(response);
        if (parsedResponse.password.toString('utf8') === value) {
          (!parsedResponse.pwdTemp) ?
            user = true :
            res.status(200).send(getMessage(false, CHANGE_TMP_PASSWORD));
        }
      }
    } else {
      let args = ({
        patientId: username,
        newPassword: newPassword,
      });
      args = [JSON.stringify(args)];
      const response = await network.invoke(networkObj, false, capitalize(role) + 'Contract:updatePatientPassword', args);
      (response.error) ? res.status(500).send(response.error) : user = true;
    }
  }

  if (user) {

    const accessToken = generateAccessToken(username, role);
    const refreshToken = jwt.sign({username: username, role: role}, refreshSecretToken);
    refreshTokens.push(refreshToken);

    res.status(200);
    res.json({
      accessToken,
      refreshToken,
    });
  } else {
    res.status(400).send({error: 'Username or password incorrect!'});
  }
});

app.post('/token', (req, res) => {
  const {token} = req.body;

  if (!token) {
    return res.sendStatus(401);
  }

  if (!refreshTokens.includes(token)) {
    return res.sendStatus(403);
  }

  jwt.verify(token, refreshSecretToken, (err, username) => {
    if (err) {
      return res.sendStatus(403);
    }

    const accessToken = generateAccessToken({username: username, role: req.headers.role});
    res.json({
      accessToken,
    });
  });
});

app.delete('/logout', (req, res) => {
  refreshTokens = refreshTokens.filter((token) => token !== req.headers.token);
  res.sendStatus(204);
});

app.post('/doctors/register', authenticateJWT, adminRoutes.createDoctor);
app.get('/patients/_all', authenticateJWT, adminRoutes.getAllPatients);
app.post('/patients/register', authenticateJWT, adminRoutes.createPatient);

app.patch('/patients/:patientId/details/medical', authenticateJWT, doctorRoutes.updatePatientMedicalDetails);
app.get('/doctors/:hospitalId([0-9]+)/:doctorId(HOSP[0-9]+\-DOC[0-9]+)', authenticateJWT, doctorRoutes.getDoctorById);

app.get('/patients/:patientId', authenticateJWT, patientRoutes.getPatientById);
app.patch('/patients/:patientId/details/personal', authenticateJWT, patientRoutes.updatePatientPersonalDetails);
app.get('/patients/:patientId/history', authenticateJWT, patientRoutes.getPatientHistoryById);
app.get('/doctors/:hospitalId([0-9]+)/_all', authenticateJWT, patientRoutes.getDoctorsByHospitalId);
app.patch('/patients/:patientId/grant/:doctorId', authenticateJWT, patientRoutes.grantAccessToDoctor);
app.patch('/patients/:patientId/revoke/:doctorId', authenticateJWT, patientRoutes.revokeAccessFromDoctor);
