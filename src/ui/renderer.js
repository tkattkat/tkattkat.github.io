const { ipcRenderer, remote } = require('electron');
const log = remote.require('./renderer.logger');
var CryptoJS = require("crypto-js");
const hwid = require('node-machine-id').machineIdSync;
log.debug('loading renderer');
// update the version number
const { version } = remote.require('./package.json');
document.querySelector('#openMenu > i').setAttribute('title', `Version ${version}`);

document.querySelector('#minimize').addEventListener('click', () => {
  remote.getCurrentWindow().minimize();
});

document.querySelector('#close').addEventListener('click', () => {
  remote.app.quit();
});

ipcRenderer.on('loadSettings', (e, settings) => {
  log.debug('loading settings');
  log.debug(JSON.stringify(settings, null, 2));
  document.querySelector('#monitorDelay').value = settings.monitor;
  document.querySelector('#timeout').value = settings.timeout;
  document.querySelector('#webhook').value = settings.webhook;
  document.querySelector('#splashSound').checked = settings.splashSound;
  document.querySelector('#password').value = !!settings.password ? settings.password : 'electra123';
})

document.querySelector('#resetSettings').addEventListener('click', () => {
  log.debug('resetting settings');
  document.querySelector('#monitorDelay').value = 5000;
  document.querySelector('#timeout').value = 15000;
  document.querySelector('#webhook').value = "";
  document.querySelector('#password').value = 'electra123';
});

document.querySelector('#saveSettings').addEventListener('click', () => {
  log.debug('saving settings');
  const password = document.querySelector('#password').value;
  ipcRenderer.send('saveSettings', {
    monitor: parseInt(document.querySelector('#monitorDelay').value),
    timeout: parseInt(document.querySelector('#timeout').value),
    webhook: document.querySelector('#webhook').value,
    splashSound: document.querySelector('#splashSound').checked,
    password: !!password ? password : 'electra123'
  });
});

document.querySelector('#saveProxies').addEventListener('click', () => {
  log.debug('saving proxies');
  const proxies = document.querySelector('#allProxies').value;
  ipcRenderer.send('saveProxies', { proxies });
})

document.querySelector('#clearProxies').addEventListener('click', () => {
  log.debug('clearing proxies');
  document.querySelector('#allProxies').value = '';
})

ipcRenderer.on('loadProxies', (e, proxies) => {
  log.debug('loading proxies');
  document.querySelector('#allProxies').value = proxies;
})

// main reads from file and then sends to renderer
// global profiles should be an array of profiles so an array of objects
ipcRenderer.on('loadProfiles', (e, data) => {
  global.profiles = !!data.length ? data : []; // check if the data imported is valid
  log.debug(`loading ${data.length} profiles`);
  rerenderSelect();
})

document.querySelector('#deleteProfile').addEventListener('click', () => {
  const selectedProfile = document.querySelector('#loadProfileSelect').value;
  log.debug(`deleteing profile ${selectedProfile}`);
  // we are going to be deleting the profile who's name matches that of the selected value
  // so we can filter out the profile from the global.profiles
  global.profiles = global.profiles.filter(({ name }) => name != selectedProfile);
  ipcRenderer.send('updateProfiles', global.profiles);
  rerenderSelect();
  ["firstName", "lastName", "email", "phone", "addr1", "addr2", "countries", "states", "city", "zip", "ccNumber", "expiry", "cvv", "profileName"].forEach((e) => {
    if (e === 'states') {
      document.querySelector(`#${e}`).selectedIndex = 0;
    } else if (e === 'countries') {
      document.querySelector(`#${e}`).selectedIndex = 0;
    } else {
      document.querySelector(`#${e}`).value = "";
    }
  });
});

window.loadProfile = () => {
  const selectedProfile = global.profiles.find(({ name }) => name == document.querySelector('#loadProfileSelect').value);
  log.debug(`loading profile ${selectedProfile}`);
  loadStates(selectedProfile.billingAddress.country);
  let firstName, lastName, fullName;
  fullName = selectedProfile.billingAddress.name.split(' ');
  firstName = fullName.splice(0, fullName.length - 1).join(' ');
  lastName = fullName[0];
  ["firstName", "lastName", "email", "phone", "addr1", "addr2", "countries", "states", "city", "zip", "ccNumber", "expiry", "cvv", "profileName"].forEach((id) => {
    if (id === 'firstName') return document.querySelector(`#${id}`).value = firstName;
    if (id === 'lastName') return document.querySelector(`#${id}`).value = lastName;
    if (id === 'email') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.email;
    if (id === 'phone') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.phone;
    if (id === 'addr1') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.line1;
    if (id === 'addr2') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.line2;
    if (id === 'countries') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.country;
    if (id === 'states') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.state;
    if (id === 'city') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.city;
    if (id === 'zip') return document.querySelector(`#${id}`).value = selectedProfile.billingAddress.postCode;
    if (id === 'ccNumber') return document.querySelector(`#${id}`).value = selectedProfile.paymentDetails.cardNumber;
    if (id === 'expiry') return document.querySelector(`#${id}`).value = `${selectedProfile.paymentDetails.cardExpMonth}/${selectedProfile.paymentDetails.cardExpYear}`;
    if (id === 'cvv') return document.querySelector(`#${id}`).value = selectedProfile.paymentDetails.cardCvv;
    if (id === 'profileName') return document.querySelector(`#${id}`).value = selectedProfile.name;
  });
}

document.querySelector('#saveProfile').addEventListener('click', () => {
  if (document.querySelector('#profileName').value === 'allProfiles') return; // 'allProfiles' cannot be used as valid profile name
  let name, billingAddress, paymentDetails, fullName, expiry, expMonth, expYear;
  let sameBillingAndShippingAddress = true, onlyCheckoutOnce = true;
  name = document.querySelector('#profileName').value;
  log.debug(`saving profile ${name}`);
  fullName = `${document.querySelector('#firstName').value} ${document.querySelector('#lastName').value}`;
  expiry = document.querySelector('#expiry').value;
  expMonth = parseInt(expiry.split('/')[0], 10);
  expYear = expiry.split('/')[1];
  billingAddress = {
    "name": fullName,
    "email": CryptoJS.AES.encrypt(document.querySelector('#email').value, hwid()).toString(),
    "phone": document.querySelector('#phone').value,
    "line1": document.querySelector('#addr1').value,
    "line2": document.querySelector('#addr2').value,
    "line3": "",
    "postCode": document.querySelector('#zip').value,
    "city": document.querySelector('#city').value,
    "state": document.querySelector('#states').value,
    "country": document.querySelector('#countries').value
  };

  paymentDetails = {
    "nameOnCard": fullName,
    "cardType": "Visa",
    "cardNumber": document.querySelector('#ccNumber').value,
    "cardExpMonth": expMonth >= 10 ? "" + expMonth : "0" + expMonth,
    "cardExpYear": expYear,
    "cardCvv": document.querySelector('#cvv').value
  };
  // we need to do a couple things first if the name already exists in the global profile then we need to replace / update
  if (!global.profiles.find((profile, i, arr) => {
    if (profile.name != name) return false;
    arr[i] = {
      name,
      billingAddress,
      shippingAddress: { ...billingAddress },
      paymentDetails,
      sameBillingAndShippingAddress,
      onlyCheckoutOnce
    };
    return true;
  })) {
    global.profiles.push({
      name,
      billingAddress,
      shippingAddress: { ...billingAddress },
      paymentDetails,
      sameBillingAndShippingAddress,
      onlyCheckoutOnce
    });
  };

  // global profiles is an array of profiles rather than a dictionary
  // what if we made the global profiles a map rather than an array

  ipcRenderer.send('updateProfiles', global.profiles);

  rerenderSelect();

  ["firstName", "lastName", "email", "phone", "addr1", "addr2", "countries", "states", "city", "zip", "ccNumber", "expiry", "cvv", "profileName"].forEach((e) => {
    if (e === 'states') {
      document.querySelector(`#${e}`).selectedIndex = 0;
    } else if (e === 'countries') {
      document.querySelector(`#${e}`).selectedIndex = 1;
    } else {
      document.querySelector(`#${e}`).value = "";
    }
  })
});

document.querySelector('#openMenu').addEventListener('click', () => {
  log.debug('opening menu');
  ipcRenderer.send('openMenu');
})

document.querySelector('#addTasks').addEventListener('click', () => {
  log.debug('adding task');
  const numTasks = document.querySelector('#numTasks').value
  const useAllProfiles = document.querySelector('#selectProfile').value === 'allProfiles';
  let taskInfo = {
    site: document.querySelector('#taskSite').value,
    siteName: document.querySelector('#taskSite').options[document.querySelector('#taskSite').selectedIndex].innerText,
    url: document.querySelector('#taskSite').options[document.querySelector('#taskSite').selectedIndex].innerText === 'Akamai Harvester'
      ? document.querySelector('#harvesterWaitingURL').value
      : document.querySelector('#waitingURL').value,

    profile: document.querySelector('#selectProfile').value,
    numTasks: numTasks,
    useProxies: document.querySelector('#useProxies').checked,
    useAutofill: document.querySelector('#useAutofill').checked,
    useAutoSolve: document.querySelector('#useAutoSolve').checked,
    useCaptchaBypass: document.querySelector('#useCaptchaBypass').checked,
    keywords: document.querySelector('#keywordsInput').value,
    color: document.querySelector('#colorInput').value,
    monitorFunction: document.querySelector('#monitorInput').value,
    priority: document.querySelector('#priorityInput').value,
    collection: document.querySelector('#collectionInput').value,
    param1: document.querySelector('#param1').value,
    param2: document.querySelector('#param2').value,
    param3: document.querySelector('#param3').value,
    mintFunction: document.querySelector('#mintFunction').value,
    size: document.querySelector('#sizeInput').value,
    delay: !!document.querySelector('#delay').value && !isNaN(parseInt(document.querySelector('#delay').value, 10)) ? parseInt(document.querySelector('#delay').value, 10) : 4500, // setting default delay here
    locationPref: document.querySelector('#locationPref').value
  };

  if (useAllProfiles) {
    for (let { name } of global.profiles) {
      taskInfo.profile = name;
      if (numTasks && !isNaN(numTasks)) {
        for (let i = 0; i < parseInt(numTasks); i++) {
          createTask({
            ...taskInfo,
            id: id()
          });
        }
      } else {
        createTask({
          ...taskInfo,
          id: id()
        });
      }
    };
    return;
  } else {
    if (numTasks && !isNaN(numTasks)) {
      for (let i = 0; i < parseInt(numTasks); i++) {
        createTask({
          ...taskInfo,
          id: id()
        });
      }
    } else {
      createTask({
        ...taskInfo,
        id: id()
      });
    }
  };

  // save tasks
  ipcRenderer.send('saveTasks');
})

function id() {
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var randomString = '';
  for (var i = 0; i < 5; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz, randomPoz + 1);
  }
  return randomString;
}

function createTask(task) {
  const supremeModes = [
    'Supreme (Faster)',
    'Supreme (Fast)',
    'Supreme (Safe)',
    'Supreme (Browser)'
  ];
  // in splash: <div class="ph-bulb ph-bulb-large"></div> 
  // passed splash: <div class="ph-bulb ph-bulb-large ph-bulb-green"></div>

  // lets make sure that the task element does not exist so that we do not double create the element
  if (document.querySelector(`#${task.id}`)) return;

  let mInput = task.url;


  if (supremeModes.includes(task.siteName)) {
    mInput = task.keywords;
  };
  if (task.siteName === 'Supreme (Instore)') {
    mInput = task.locationPref;
  };
  let html = `<tr id="${task.id}">
    <td>
      <div>${task.id}</div>
    </td>
    <td>
      <div>${task.siteName}</div>
    </td>
    <td>
      <div>${task.collection}</div>
    </td>
    <td>
      <div>${task.profile}</div>
    </td>
    <td>
      <div class="splashStatus">
        <div class="ph-bulb ph-bulb-large"></div> 
      </div>
    </td>
    <td>
      <div class="status">Not Started</div>
    </td>
    <td>
      <div class="table-buttons">
        <a href="#" class="start"><i class="fas fa-fw fa-play h-green"></i></a>
        <a href="#" class="stop"><i class="fas fa-fw fa-stop h-red"></i></a>
        <a href="#" class="openBrowser"><i class="fas fa-fw fa-window-restore h-blue"></i></a>
        <a href="#" class="delete"><i class="fas fa-fw fa-trash-alt h-red"></i></a>
      </div>
    </td>
  </tr>`;
  document.querySelector('#taskBody').innerHTML += html;
  ipcRenderer.send('createTask', task);
}

$('body').on('click', '.delete', function () {
  const id = $(this).parent().parent().parent().attr('id');
  var element = document.querySelector(`#${id}`);
  element.parentNode.removeChild(element);
  ipcRenderer.send('deleteTask', id);
})

$('body').on('click', '.stop', function () {
  const id = $(this).parent().parent().parent().attr('id');
  ipcRenderer.send('stopTask', id);
})

$('body').on('click', '.start', function () {
  const id = $(this).parent().parent().parent().attr('id');
  ipcRenderer.send('startTask', id);
})

$('body').on('click', '.openBrowser', function () {
  const id = $(this).parent().parent().parent().attr('id');
  ipcRenderer.send('openBrowser', id);
})

$('#startAllTasks').on('click', () => {
  log.debug('starting all tasks');
  ipcRenderer.send('startAllTasks')
})

$('#stopAllTasks').on('click', function () {
  log.debug('stopping all tasks');
  ipcRenderer.send('stopAllTasks');
})

$('#deleteAllTasks').on('click', function () {
  log.debug('deleting all tasks');
  ipcRenderer.send('deleteAllTasks');
  $('#taskBody').empty();
})

ipcRenderer.on('updateStatus', (e, { status, id }) => {
  document.querySelector(`#${id} .status`).innerText = status;
  if (status.toLowerCase().includes('mined')) {
    ipcRenderer.send('play-sound');
    ipcRenderer.send('send-notification', { status, id });
    document.querySelector(`#${id} .splashStatus`).innerHTML = `<div class="ph-bulb ph-bulb-large ph-bulb-green"></div>`;
  } else if (status.toLowerCase().includes('failed')) {
    ipcRenderer.send('send-notification', { status, id });
    document.querySelector(`#${id} .splashStatus`).innerHTML = `<div class="ph-bulb ph-bulb-large ph-bulb-red"></div>`;
  };
});
ipcRenderer.on('createTasks', (e, tasks) => {
  tasks = Object.values(tasks);
  log.debug(`creating ${tasks.length} tasks`);
  tasks.forEach(task => createTask(task));
});

// our global profiles will be a collection of profiles
// ! 
// profile: 
/**
 * {
 *  name,
 *  billingAddress
 *  shippingAddress
 *  paymentDetails
 *  onlyCheckoutOnce
 *  sameBillingAndShippingAddress
 * }
 */
function rerenderSelect() {
  log.debug('rendering profiles');
  document.querySelector('#loadProfileSelect').innerHTML = global.profiles.reduce((acc, { name }, idx, arr) => acc += `<option value="${name}">${name}</option>`, '<option selected value="" disabled>Choose a profile</option>');
  document.querySelector('#selectProfile').innerHTML = global.profiles.reduce((acc, { name }, idx, arr) => acc += `<option value="${name}">${name}</option>`, '<option selected value="" disabled>Choose a profile</option><option value="allProfiles">All Profiles</option>');
}

function resetTaskOptions() {
  document.querySelector('#numTasks').value = "";
  document.querySelector('#waitingURL').value = "";
  document.querySelector('#selectProfile').value = "";
  document.querySelector('#useProxies').checked = true;
  document.querySelector('#useAutofill').checked = true;
  document.querySelector('#useAutoSolve').checked = false;
  document.querySelector('#useCaptchaBypass').checked = false;
  document.querySelector('#keywordsInput').value = "";
  document.querySelector('#colorInput').value = "";
  document.querySelector('#monitorInput').value = "";
  document.querySelector('#priorityInput').value = "";
  document.querySelector('#collectionInput').value = "";
  document.querySelector('#param1').value = "";
  document.querySelector('#param2').value = "";
  document.querySelector('#param3').value = "";
  document.querySelector('#mintFunction').value = "";
  document.querySelector('#sizeInput').value = "";
  document.querySelector('#delay').value = "";
  document.querySelector('#locationPref').selectedIndex = 0;
  log.debug('task options reset');
};

document.querySelector('#resetTasks').addEventListener('click', resetTaskOptions);


$('#taskSite').on('change', () => {
  resetTaskOptions();
  let taskSite = $('#taskSite option:selected').text();
  if (taskSite === 'Mint' ||
    taskSite === 'Mints' ||
    taskSite === 'Supreme (Safe)' ||
    taskSite === 'Supreme (Browser)'
  ) {

    $('#priorityGroup').show();
    $('#locationGroup').show();
    $('#profileGroup').show();
    $('#proxyPoolGroup').show();
    $('#colorGroup').show();
    $('#sizeGroup').show();
    $('#param2Group').show();
    $('#autofillGroup').show();
    $('#autosolveGroup').show();
  } else if (taskSite === 'Opensea') {
    //$('#urlGroup').show();
    $('#profileGroup').hide();
    //$('$collectionGroup').show()
    $('#proxyPoolGroup').hide();
    $('#autofillGroup').hide();
    $('#autosolveGroup').hide();
    $('#keywordsGroup').hide();
    $('#colorGroup').hide();
    $('#monitorGroup').hide();
    $('#sizeGroup').hide();
    $('#delayGroup').show();
    $('#bypassGroup').hide();
    $('#priorityGroup').hide();
    $('#param2Group').hide();
    $('#locationGroup').hide();
    //$('#param2Group').hide();


  } else if (taskSite === 'Mint (param)') {
    // Akamai Harvester
    // when we swap to this we need to also reset the profileGroup value

    $('#priorityGroup').show();
    //$('#locationGroup').show();
    $('#profileGroup').show();
   // $('#proxyPoolGroup').show();
    // $('#autofillGroup').show();
    // $('#autosolveGroup').hide();\
    $('#mintFunctionGroup').show();


    $('#keywordsGroup').show();
    $('#colorGroup').show();
    $('#sizeGroup').show();
    // $('#delayGroup').hide();
    $('#param2Group').show();
   // $('#autofillGroup').show();
   // $('#autosolveGroup').show();
  } else {
    // Everything else
    $('#keywordsGroup').hide();
    $('#colorGroup').hide();
    if (!['Footaction', 'Eastbay', 'Footlocker CA', 'Footlocker US', 'Kids Footlocker', 'Champssports'].includes(taskSite)) {
      $('#sizeGroup').hide();
    } else {
      $('#sizeGroup').show();
    }
    $('#delayGroup').hide();
    $('#bypassGroup').hide();
    $('#locationGroup').hide();
    $('#harvesterURLGroup').hide();

    $('#urlGroup').show();
    $('#profileGroup').show();
    $('#proxyPoolGroup').show();
    $('#autofillGroup').show();
    $('#autosolveGroup').show();
  };
  log.debug(`loaded ${taskSite} task options`);
});

const countryOptions = [
  'test'
];
const usaOptions = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "DC": "District Of Columbia",
  "FL": "Florida",
  "GA": "Georgia",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PA": "Pennsylvania",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming",
};
const canadaOptions = {
  "AB": "Alberta",
  "BC": "British Columnbia",
  "MB": "Manitoba",
  "NB": "New Brunswick",
  "NL": "Newfoundland and Labrador",
  "NT": "Northwest Territories",
  "NS": "Nova Scotia",
  "NU": "Nunavut",
  "ON": "Ontario",
  "PE": "Prince Edward Island",
  "QC": "Quebec",
  "SK": "Saskatchewan",
  "YT": "Yukon"
};
const chinaOptions = [
  "Anhui",
  "Beijing",
  "Chongqing",
  "Fujian",
  "Guangdong",
  "Gansu",
  "Guangxi Zhuang",
  "Guizhou",
  "Henan",
  "Hubei",
  "Hebei",
  "Hainan",
  "Hong Kong",
  "Heilongjiang",
  "Hunan",
  "Jilin",
  "Jiangsu",
  "Jiangxi",
  "Liaoning",
  "Macau",
  "Inner Mongolia",
  "Ningxia Hui",
  "Qinghai",
  "Sichuan",
  "Shandong",
  "Shanghai",
  "Shaanxi",
  "Shanxi",
  "Tianjin",
  "Taiwan",
  "Xinjiang Uyghur",
  "Tibet",
  "Yunnan",
  "Zhejiang"
];
const japanOptions = [
  "Aichi",
  "Akita",
  "Aomori",
  "Chiba",
  "Ehime",
  "Fukui",
  "Fukuoka",
  "Fukushima",
  "Gifu",
  "Gunma",
  "Hiroshima",
  "Hokkaido",
  "Hyogo",
  "Ibaraki",
  "Ishikawa",
  "Iwate",
  "Kagawa",
  "Kagoshima",
  "Kanagawa",
  "Kochi",
  "Kumamoto",
  "Kyoto",
  "Mie",
  "Miyagi",
  "Miyazaki",
  "Nagano",
  "Nagasaki",
  "Nara",
  "Niigata",
  "Oita",
  "Okayama",
  "Okinawa",
  "Osaka",
  "Saga",
  "Saitama",
  "Shiga",
  "Shimane",
  "Shizuoka",
  "Tochigi",
  "Tokushima",
  "Tokyo",
  "Tottori",
  "Toyama",
  "Wakayama",
  "Yamagata",
  "Yamaguchi",
  "Yamanashi"
];

let $countries = $('#countries');
let $states = $('#states');
// init rest of countries
$.each(countryOptions, (index, value) => {
  $countries.append($("<option></option>").attr('value', value).text(value))
});
log.debug('loaded country options');
// init states
$.each(usaOptions, (key, value) => {
  $states.append($("<option></option>").attr('value', value).text(value))
});
log.debug('loaded usa states options');
function loadStates(countryName) {
  // replace the option values for the state
  $states.empty();
  if (countryName == 'United States') {
    $.each(usaOptions, (key, value) => {
      $states.append($("<option></option>").attr('value', value).text(value));
    });
    log.debug('loaded usa states options');
  } else if (countryName == 'Canada') {
    $.each(canadaOptions, (key, value) => {
      $states.append($("<option></option>").attr('value', value).text(value))
    });
    log.debug('loaded canada states options');
  } else if (countryName == 'China') {
    $.each(chinaOptions, (index, value) => {
      $states.append($("<option></option>").attr('value', value).text(value))
    });
    log.debug('loaded china states options');
  } else if (countryName == 'Japan') {
    $.each(japanOptions, (index, value) => {
      $states.append($("<option></option>").attr('value', value).text(value))
    });
    log.debug('loaded japan states options');
  };
};
$countries.on('change', e => loadStates(e.target.value));

