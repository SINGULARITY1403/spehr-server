const fs = require('fs');
const {enrollAdmins} = require('./enrollAdmins');
const {enrollRegisterUser} = require('./registerUser');
const {createRedisClient} = require('./utils');

const redis = require('redis');


async function initLedger() {
  try {
    const jsonString = fs.readFileSync('../patient-asset-transfer/chaincode/lib/initLedger.json');
    const patients = JSON.parse(jsonString);
    let i = 0;
    for (i = 0; i < patients.length; i++) {
      const attr = {firstName: patients[i].firstName, lastName: patients[i].lastName, role: 'patient'};
      await enrollRegisterUser('1', 'PID'+i, JSON.stringify(attr));
    }
  } catch (err) {
    console.log(err);
  }
}

async function initRedis() {
  let redisUrl = 'redis://127.0.0.1:6379';
  let redisPassword = 'hosp1lithium';
  let redisClient = redis.createClient(redisUrl);
  redisClient.AUTH(redisPassword);
  redisClient.SET('hosp1admin', redisPassword);
  redisClient.QUIT();

  redisUrl = 'redis://127.0.0.1:6380';
  redisPassword = 'hosp2lithium';
  redisClient = redis.createClient(redisUrl);
  redisClient.AUTH(redisPassword);
  redisClient.SET('hosp2admin', redisPassword);
  console.log('Done');
  redisClient.QUIT();
  return;
}

async function enrollAndRegisterDoctors() {
  try {
    const jsonString = fs.readFileSync('./initDoctors.json');
    const doctors = JSON.parse(jsonString);
    for (let i = 0; i < doctors.length; i++) {
      const attr = {firstName: doctors[i].firstName, lastName: doctors[i].lastName, role: 'doctor', speciality: doctors[i].speciality};

      doctors[i].hospitalId = parseInt(doctors[i].hospitalId);
      const redisClient = createRedisClient(doctors[i].hospitalId);
      (await redisClient).SET('HOSP' + doctors[i].hospitalId + '-' + 'DOC' + i, 'password');
      await enrollRegisterUser(doctors[i].hospitalId, 'HOSP' + doctors[i].hospitalId + '-' + 'DOC' + i, JSON.stringify(attr));
      (await redisClient).QUIT();
    }
  } catch (error) {
    console.log(error);
  }
};

async function main() {
  await enrollAdmins();
  await initLedger();
  await initRedis();
  await enrollAndRegisterDoctors();
}


main();
