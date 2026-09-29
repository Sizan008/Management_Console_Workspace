
export const environment = {
  production: true,
  appName: 'Microfont POC',
  // change your appId, clientId only.
  appId: '1',
  keycloak: {
    url: 'http://192.168.10.56:9080',
    realm: 'MicroCube_dev',
    clientId: 'Sentinel_FE'
  },


  // Login/Redirect URLs - (add your appId - 4***).
  loginUrl:'http://localhost:4001',
  redirectUri:'http://localhost:4001/landing/home',

  // Base/Keycloak/Session data URLs
  apiBaseUrl:'http://192.168.10.56:9999',
  myBaseUrl:'http://192.168.10.56:9999/Sentinel/v1',  //*change with your api servlet*

  centrinoUrl:'http://192.168.10.56:9999/Centrino/v1',
  sentinelUrl:'http://192.168.10.56:9999/Sentinel/v1',
  workSpaceSessionAppId: true,
  // Report Management Backend API (DO NOT CHANGE).
  reportManagementApiUrl: 'http://192.168.10.56:9999/Centrino/v1',

  // Notification Management Backend API .
  novu_identifier: '1uXpKIJUa3Rg',
  novu_socket: 'http://192.168.10.56:3002',
  novu_api: 'http://192.168.10.56:3000/novu/api',


};
