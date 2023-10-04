import { cleanSlate } from '../requests/projects'
import { getCloudAccountIDs } from '../requests/cloudAccounts'

export const _threeSeconds = 3000
export const _fiveSeconds = 3000
export const _tenSeconds = 10000
export const _fifteenSeconds = 15000
export const _twentySeconds = 20000
export const _fourtySeconds = 40000
export const _sixtySeconds = 60000
export const _twoMins = 120000
export const _threeMins = 180000
export const _sixMins = 360000
export const _tenMins = 600000
export const _fifteenMins = 900000


function initAPISpecRoutine(routineName) {
    switch (routineName) {
        case "before":
            cy.login()
            .then(cleanUp => { cleanSlate() })
            .then(() => { Cypress.env('cloudAccountIDs', getCloudAccountIDs()) })
            break;
        case "beforeEach":
            break;
        case "after":
            Cypress.session.clearAllSavedSessions()
            break;
        case "afterEach":
        default:
    }
}
function letsWait(msg, seconds) {
    cy.log(msg)
    cy.wait(seconds)
}

function getSpecBasedNamePrefix() {
    var specBasedNamePrefix = Cypress.spec.name.split("/")
    specBasedNamePrefix = "BAT-" + specBasedNamePrefix[specBasedNamePrefix.length - 1].replace(".spec.js", "") + "-"
    return specBasedNamePrefix
}

function validateURL(url) {
    return { method: 'GET', headers: { 'x-cookie': Cypress.env('tcsToken') }, url: url }
}

function getDecodedString(encodedString) {
    let buff = new Buffer(encodedString, 'base64')
    let decodedString = buff.toString('ascii')
    return decodedString
}

function arrayCheckerForPartialMatch(sourceArray, targetArray) {
    /* 
    This functions compare elements of targetArray with sourceArray
    If all elements of targetArray are partially matched in sourceArray it returns true
    */
    let result = false
    targetArray.forEach((element) => {
        if (sourceArray.filter(s => s.includes(element)).length > 0) {
            result = true
        }
    })
    return result
}

function getPageOffset(store) {
    /**
    * Returns the same object that is passed in parameters
    *
    * @param {Object} store object which includes limit, totalCount
    * @return {Object} store object containing {firstPageRuleCount, totalRuleCount, offset} etc
    */
    if (store.totalCount % store.limit === 0) {
        store.offset = store.totalCount - store.limit;
    }
    else {
        store.offset = store.totalCount - (store.totalCount % store.limit);
    }
    // Here store.offset corresponds to the offset of the last page
    return store;
}


function generateRandomNumber(limit) {
    let rand = Math.random() * (limit);
    rand = Math.floor(rand);
    return rand;
}

/**
 * 
 * @param {*} json 
 * @param {*} keyname 
 * @param {*} value 
 * @returns true when keyname and >+ value pair exists
 */

function _jsonHasKeyWithMininumValue(json, keyname, value) {
    cy.log(`Looking for key: ${keyname} to eq or gt than value: ${value}`)
    if (!json || typeof json !== 'object') {
        return false; // If json is null, undefined, or not an object, return false.
    }
    if (keyname in json && json[keyname] >= value) {
        return true; // If the key is found and the value meets the minimum requirement, return true.
    }
    for (const key in json) {
      if (_jsonHasKeyWithMininumValue(json[key], keyname, value)) {
            return true; // Recursively check nested objects.
      }
    }
    return false; // If key is not found, return false.
}
  

/**
 * 
 * @param {*} obj 
 * @param {*} key 
 * @param {*} value 
 * @returns true if json object has key-value pair 
 */
function hasKeyValuePair(jsonObj, key, value) {
    if (typeof jsonObj !== 'object' || jsonObj === null) {
        return false;
    }
    if (jsonObj[key] === value) { return true; }
    for (let nestedKey in jsonObj) {
        if (hasKeyValuePair(jsonObj[nestedKey], key, value)) {
            return true;
        }
    }
    return false;
}

function cloudCredentialsGenerator(cloudProvider) {
    let credentials='';
    if(cloudProvider==='aws'){
      let accountIdLength = 12;
      const allowedCharacters = '0123456789';
      for (let i = 0; i < accountIdLength; i++) {
        const randomIndex = Math.floor(Math.random() * allowedCharacters.length);
        credentials += allowedCharacters.charAt(randomIndex);
      }
      credentials = {
            "external_id": `${credentials}`,
            "role_arn":`arn:aws:iam::${credentials}:generated-by_bat_api`
        }
    }
    else if (cloudProvider==='azure'){
      const allowedCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let clientId='', clientSecret='', tenantId='', subscriptionId='';
      for (let i = 0; i < 24; i++) { clientId += allowedCharacters.charAt(Math.floor(Math.random() * allowedCharacters.length));}
      for (let i = 0; i < 44; i++) { clientSecret += allowedCharacters.charAt(Math.floor(Math.random() * allowedCharacters.length));}
      for (let i = 0; i < 36; i++) { tenantId += allowedCharacters.charAt(Math.floor(Math.random() * allowedCharacters.length));}
      for (let i = 0; i < 36; i++) { subscriptionId += allowedCharacters.charAt(Math.floor(Math.random() * allowedCharacters.length));}
      credentials = {
        client_id: clientId,
        client_secret: clientSecret,
        tenant_id: tenantId,
        subscription_id: subscriptionId
      };
    }
    else if (cloudProvider==='gcp'){
      const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
      const randomString = (length) => [...Array(length)].map(() => (Math.random() * 36 | 0).toString(36)).join('');
      
      // const type = "service_account";
      const project_id = `Generated-by-BAT-API-${randomInt(10000000, 99999999)}`;
      const private_key_id = randomString(20);
      const client_id = randomString(21);

      const serviceAccountCredentials = `"{\n  \"type\": \"service_account\",\n  \"project_id\": \"${project_id}\",\n  \"private_key_id\": \"${private_key_id}\",\n  \"private_key\": \"-----BEGIN PRIVATE KEY-----\\n${project_id}\\n-----END PRIVATE KEY-----\\n\",\n  \"client_email\": \"gcp-test@${project_id}.iam.gserviceaccount.com\",\n  \"client_id\": \"${client_id}\",\n  \"auth_uri\": \"https://accounts.google.com/o/oauth2/auth\",\n  \"token_uri\": \"https://oauth2.googleapis.com/token\",\n  \"auth_provider_x509_cert_url\": \"https://www.googleapis.com/oauth2/v1/certs\",\n  \"client_x509_cert_url\": \"https://www.googleapis.com/robot/v1/metadata/x509/gcp-test%40${project_id}.iam.gserviceaccount.com\"\n}\n"`
      credentials = {
            service_account_credentials: serviceAccountCredentials
      }
    }
    return credentials;
  }


export { 
        hasKeyValuePair, _jsonHasKeyWithMininumValue, initAPISpecRoutine, validateURL, 
        getSpecBasedNamePrefix, arrayCheckerForPartialMatch, letsWait, getDecodedString, 
        getPageOffset, generateRandomNumber, cloudCredentialsGenerator }
