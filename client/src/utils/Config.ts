export default {
  BASE_URL: process.env.REACT_APP_BASE_URL ?? window.location.origin,
  DEBUG : true//process.env.DEBUG !== undefined ?? false
};
