const dns = require('node:dns');
const originalLookup = dns.lookup;
const HOSTS = {
  'api.vercel.com': '76.76.21.21',
  'vercel.com': '76.76.21.21',
  'roimbcfpjyqhtzlyspbb.supabase.co': '104.18.38.10',
};

dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (HOSTS[hostname]) {
    const ip = HOSTS[hostname];
    if (options && options.all) {
      return process.nextTick(() => callback(null, [{ address: ip, family: 4 }]));
    }
    return process.nextTick(() => callback(null, ip, 4));
  }
  return originalLookup.call(dns, hostname, options, callback);
};
