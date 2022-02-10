// log.info(`importing google accounts from ${filepathAccounts}`);

// // SECTION: read accounts
// // read the account data then create the map
// let accountMap;
// const accountData = JSON.parse(fs.readFileSync(filepathAccounts, { encoding: 'utf8' }));
// if (accountData instanceof Array) {
//   //create the map from file data
//   accountMap = new Map(accountData);
// } else {
//   accountMap = new Map();
// };

// function addNewAccount() {
//   let name = `Account ${accountMap.size}`;
//   let id = uuid();
//   accountMap.set(id, {
//     id,
//     name,
//     proxy: ''
//   });
//   fs.writeFileSync(filepathAccounts, JSON.stringify([...accountMap]));
//   log.info('created new google account');
//   log.debug(accountMap.get(id));
//   openAccount(accountMap.get(id));
//   renderMenu();
// }

// const openAccount = async (value) => {
//   log.debug('opening google account');
//   log.debug(value);

//   let b = new BrowserWindow({
//     width: 450,
//     height: 475,
//     frame: false,
//     transparent: true,
//     resizable: false,
//     show: false,
//     webPreferences: {
//       devTools,
//       nodeIntegration: true,
//       contextIsolation: false,
//       enableRemoteModule: true,
//       webSecurity: false,
//       session: session.fromPartition(`persist:${value.id}`)
//     }
//   });

//   accountMap.get(value.id).b_id = b.id;

//   b.on('ready-to-show', () => {
//     b.show();
//   });

//   b.on('closed', () => {
//     // set browser to null
//     b = null;

//     // remove bid from account obj
//     accountMap.get(value.id).b_id = null;
//   });

//   await b.loadURL(`file://${path.join(__dirname, './src/googleAccount.html')}`);
// };
