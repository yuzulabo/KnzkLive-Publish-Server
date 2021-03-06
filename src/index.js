const { NodeMediaServer } = require('node-media-server');
const axios = require('axios');
const fs = require('fs');
// eslint-disable-next-line import/no-unresolved
const conf = require('../config');

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 100000,
    gop_cache: false,
    ping: 60,
    ping_timeout: 30
  },
  http: {
    port: conf.http_port,
    allow_origin: '*',
    mediaroot: './media'
  },
  knzklive: {
    api_endpoint: conf.endpoint,
    api_key: conf.APIKey
  }
};

if (conf.https_port) {
  config.https = {
    port: conf.https_port,
    cert: conf.https_cert,
    key: conf.https_key
  };
}

if (conf.ffmpeg_path) {
  const tasks = [
    {
      app: 'live',
      ac: 'aac',
      hls: true,
      hlsFlags: '[hls_time=1:hls_list_size=2:hls_flags=delete_segments]'
    }
  ];

  if (conf.enable_ts) {
    tasks.push({
      app: 'ts',
      mp4: true,
      mp4Flags: '[movflags=faststart]'
    });
  }

  config.trans = {
    ffmpeg: conf.ffmpeg_path,
    tasks
  };
}

function getLastFile(dir) {
  const files = fs.readdirSync(dir);
  return files[files.length - 1];
}

const nms = new NodeMediaServer(config);
nms.run();

nms.on('prePublish', (id, StreamPath, args) => {
  // eslint-disable-next-line no-console
  console.log(
    '[NodeEvent on prePublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('donePublish', (id, StreamPath, args) => {
  // eslint-disable-next-line no-console
  console.log(
    '[NodeEvent on donePublish]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
  const dir = `${config.http.mediaroot}/ts/${StreamPath.replace(
    /\/live\/(\d+)stream/g,
    '$1'
  )}stream`;
  const file = conf.enable_ts ? getLastFile(dir) : 'none';
  axios
    .get(
      `${config.knzklive.api_endpoint}publish.php?token=${
        args.token
      }&live=${StreamPath}&authorization=${
        config.knzklive.api_key
      }&mode=done_publish&ts_file=${file}`
    )
    .then(response => {
      // eslint-disable-next-line no-console
      console.log('[donePublish]', response);
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.log('[donePublish]', error);
    });
});

nms.on('postPlay', (id, StreamPath, args) => {
  // eslint-disable-next-line no-console
  console.log(
    '[NodeEvent on postPlay]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});

nms.on('donePlay', (id, StreamPath, args) => {
  // eslint-disable-next-line no-console
  console.log(
    '[NodeEvent on donePlay]',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
});
