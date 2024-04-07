export default {
  BASE_URL: process.env.REACT_APP_BASE_URL ?? '',
  CHUNK_SIZE_MB: parseInt(process.env.REACT_APP_CHUNK_SIZE_MB ?? '50'),
};
